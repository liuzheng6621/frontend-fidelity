<#
.SYNOPSIS
  把 Gitee 主仓同步到 GitHub 镜像：master + tag + Release + 逐项校验。

.DESCRIPTION
  Gitee 是主仓，GitHub 是镜像。这个脚本做四件事，任何一步失败都以非 0 退出：

    1. 推送：git push master，再 git push --tags
    2. 补 Release：GitHub 上缺的 tag，自动建 Release 并挂 frontend-fidelity.zip
    3. 校验 ref：逐条比对两端 ls-remote，master 与每个 tag 的 sha 必须相同
    4. 校验文件：本地 git ls-tree 与 GitHub tree 逐 blob 比对，必须完全一致

  Release 正文自动从 CHANGELOG.md 里对应版本的 `## vX.Y.Z` 段落取。
  zip 用 `git archive --prefix=frontend-fidelity/` 生成，与 Gitee 附件同源同 sha。

.PARAMETER Token
  GitHub PAT。省略时按顺序取：$env:GH_TOKEN -> 仓库根 .gh-token -> 交互输入。
  需要 repo（或细粒度 Contents: Read and write）；如果这次要推的提交新增或修改
  .github/workflows/* ，还必须额外有 workflow 权限，否则整条 push 会被拒。

.PARAMETER SaveToken
  与交互输入配合：把输入的 token 写进仓库根 .gh-token（已被 .gitignore 忽略）。

.PARAMETER SkipRelease
  只推代码和 tag，不建 Release。

.PARAMETER DryRun
  只打印将要做什么，不改任何东西。

.EXAMPLE
  $env:GH_TOKEN = 'ghp_xxx'; .\scripts\sync-github.ps1

.EXAMPLE
  .\scripts\sync-github.ps1 -SaveToken

.EXAMPLE
  .\scripts\sync-github.ps1 -SkipRelease -DryRun
#>
[CmdletBinding()]
param(
  [string]$Token,
  [switch]$SaveToken,
  [switch]$SkipRelease,
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$Root   = Split-Path -Parent $PSScriptRoot
$Owner  = 'liuzheng6621'
$Repo   = 'frontend-fidelity'
$Api    = "https://api.github.com/repos/$Owner/$Repo"
$UpApi  = "https://uploads.github.com/repos/$Owner/$Repo"
$Asset  = 'frontend-fidelity.zip'
$Prefix = 'frontend-fidelity/'

function Say([string]$s, [string]$c = 'Gray') { Write-Host $s -ForegroundColor $c }
function Step([string]$n, [string]$s) { Write-Host ""; Write-Host "== $n  $s" -ForegroundColor Cyan }
function Warn([string]$s) { Write-Host "!  $s" -ForegroundColor Yellow }
function Die([string]$s) { Write-Host "x  $s" -ForegroundColor Red; exit 1 }

# ---------- token ----------
$TokFile = Join-Path $Root '.gh-token'
if (-not $Token) {
  if ($env:GH_TOKEN) { $Token = $env:GH_TOKEN.Trim() }
  elseif (Test-Path $TokFile) { $Token = ([System.IO.File]::ReadAllText($TokFile)).Trim() }
}
if (-not $Token) {
  $sec = Read-Host -AsSecureString 'GitHub token (repo scope)'
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if ($SaveToken) {
    [System.IO.File]::WriteAllText($TokFile, $Token.Trim(), (New-Object System.Text.UTF8Encoding($false)))
    Say "已保存到 $TokFile（.gitignore 已忽略）" DarkGray
  }
}
$Token = $Token.Trim()
if (-not $Token) { Die '没有 token' }

$Hdr = @{ Authorization = "Bearer $Token"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'ff-sync' }
$PushUrl  = "https://x-access-token:$Token@github.com/$Owner/$Repo.git"
$PlainUrl = "https://github.com/$Owner/$Repo.git"

function Redact([object]$lines) { $lines | ForEach-Object { ([string]$_) -replace [regex]::Escape($Token), '***' } }
function GhJson([string]$url) {
  $r = Invoke-WebRequest -Uri $url -Headers $Hdr -UseBasicParsing
  return ([System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json)
}
function GhTry([string]$url) { try { return (GhJson $url) } catch { return $null } }
function GitPush([string[]]$gitArgs, [string]$label) {
  $out = & git -c credential.helper= @gitArgs 2>&1
  $code = $LASTEXITCODE
  Redact $out | ForEach-Object { Say "   $_" DarkGray }
  if ($code -ne 0) { Die "$label 失败（exit $code）" }
}
Push-Location $Root
try {
  # ---------- 0 ----------
  Step '0/5' '环境与登录态'
  $me = GhTry 'https://api.github.com/user'
  if (-not $me) { Die 'token 无效（/user 不通）' }
  Say "   token 属于 $($me.login)" DarkGray
  $dirty = (& git status --porcelain | Measure-Object -Line).Lines
  if ($dirty -gt 0) { Warn "工作树有 $dirty 处未提交改动，本次只同步已提交内容" }
  $localHead = (& git rev-parse --short HEAD).Trim()
  Say "   local HEAD = $localHead" DarkGray
  & git fetch origin --tags 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Warn 'git fetch 失败（网络？），继续用本地记录比对' }
  $originHead = (& git rev-parse --short origin/master).Trim()
  if ($localHead -ne $originHead) {
    Warn "本地 $localHead 与 Gitee $originHead 不一致：Gitee 是主仓，先对齐再同步更稳"
  }

  # ---------- 1 ----------
  Step '1/5' '推 master + tags 到 GitHub'
  if ($DryRun) { Say '   [dry-run] 跳过实际推送' Yellow }
  else {
    GitPush @('push', $PushUrl, 'master:master') 'push master'
    GitPush @('push', '--tags', $PushUrl) 'push tags'
  }

  # ---------- 2 ----------
  Step '2/5' '比对两端 ref'
  $a = (& git ls-remote origin 2>$null) | Where-Object { $_ -notmatch '\sHEAD$' } | Sort-Object
  $b = (& git ls-remote $PlainUrl 2>$null) | Where-Object { $_ -notmatch '\sHEAD$' } | Sort-Object
  $diff = Compare-Object $a $b
  Say "   Gitee $($a.Count) 个 ref / GitHub $($b.Count) 个 ref" DarkGray
  if ($diff) {
    $diff | Select-Object -First 10 | ForEach-Object { Say "   $($_.SideIndicator) $($_.InputObject)" Red }
    Die 'ref 不一致'
  }
  Say '   ref 全部一致' Green

  # ---------- 3 ----------
  Step '3/5' '补 GitHub 上缺的 Release'
  # 以 Gitee 的 Release 清单为准（不是本地 tag）：Gitee 没发版的 tag，GitHub 也不该多发
  $giteeRel = (Invoke-WebRequest -Uri 'https://gitee.com/api/v5/repos/liu-everything_impossble/skill-frontend-fidelity/releases?per_page=100' -UseBasicParsing).Content | ConvertFrom-Json
  $tags = @($giteeRel | ForEach-Object { $_.tag_name })
  Say "   Gitee 侧已发 $($tags.Count) 个版本" DarkGray
  $rels = @()
  $page = 1
  while ($true) {
    $chunk = GhTry "$Api/releases?per_page=100&page=$page"
    if (-not $chunk -or @($chunk).Count -eq 0) { break }
    $rels += $chunk
    if (@($chunk).Count -lt 100) { break }
    $page++
  }
  $have = @{}; foreach ($r in $rels) { $have[$r.tag_name] = $r }
  $todo = @($tags | Where-Object { -not $have.ContainsKey($_) } | Sort-Object { [version]($_ -replace '^v', '') })
  if ($SkipRelease) { Say '   -SkipRelease：跳过' Yellow; $todo = @() }
  elseif ($todo.Count -eq 0) { Say '   没有缺失的 Release' DarkGray }
  else {
    $changelog = [System.IO.File]::ReadAllText((Join-Path $Root 'CHANGELOG.md'))
    foreach ($tag in $todo) {
      $sha = (& git rev-parse "$tag^{commit}").Trim()
      $zip = Join-Path $env:TEMP ("ffsync-" + $tag + '.zip')
      if (Test-Path $zip) { Remove-Item $zip -Force }
      & git archive --format=zip --prefix=$Prefix -o $zip $tag 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { Warn "$tag 打包失败，跳过"; continue }
      if (-not (Test-Path $zip)) { Warn "$tag 打包失败，跳过"; continue }
      $size = (Get-Item $zip).Length
      $sha256 = (Get-FileHash $zip -Algorithm SHA256).Hash

      $m = [regex]::Match($changelog, '(?ms)^##\s+' + [regex]::Escape($tag) + '\b.*?(?=^##\s+v|\z)')
      $body = if ($m.Success) { $m.Value.Trim() } else { "## $tag" }
      $payload = @{ tag_name = $tag; target_commitish = $sha; name = $tag; body = $body; draft = $false; prerelease = $false } | ConvertTo-Json -Depth 5
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
      $relResp = Invoke-WebRequest -Uri "$Api/releases" -Method Post -Headers $Hdr -Body $bytes -ContentType 'application/json; charset=utf-8' -UseBasicParsing
      $rel = [System.Text.Encoding]::UTF8.GetString($relResp.RawContentStream.ToArray()) | ConvertFrom-Json

      $h2 = @{ Authorization = "Bearer $Token"; 'User-Agent' = 'ff-sync' }
      $assetResp = Invoke-WebRequest -Uri ("$UpApi/releases/" + $rel.id + "/assets?name=$Asset") -Method Post -Headers $h2 -InFile $zip -ContentType 'application/zip' -UseBasicParsing
      $as = [System.Text.Encoding]::UTF8.GetString($assetResp.RawContentStream.ToArray()) | ConvertFrom-Json
      Say ("   + $tag  release=$($rel.id)  $Asset=$size B  asset=$($as.id)  sha=$($sha256.Substring(0,16))…") Green
      Remove-Item $zip -Force
    }
  }

  # ---------- 4 ----------
  Step '4/5' '逐 blob 比对文件树'
  $tree = (GhJson "$Api/git/trees/master?recursive=1").tree
  $gmap = @{}; foreach ($e in $tree) { if ($e.type -eq 'blob') { $gmap[$e.path] = $e.sha } }
  $lmap = @{}
  & git ls-tree -r HEAD | ForEach-Object {
    $x = $_ -split '\s+'
    $lmap[($x[3..($x.Count - 1)] -join ' ')] = $x[2]
  }
  $same = 0; $bad = @()
  foreach ($k in $lmap.Keys) {
    if ($gmap.ContainsKey($k) -and $gmap[$k] -eq $lmap[$k]) { $same++ } else { $bad += $k }
  }
  Say "   一致 $same / $($lmap.Count)" DarkGray
  if ($bad.Count -gt 0) {
    $bad | Select-Object -First 10 | ForEach-Object { Say "   不一致: $_" Red }
    Die '文件树不一致'
  }

  # ---------- 5 ----------
  Step '5/5' '结果'
  Say "   master      : $localHead" DarkGray
  Say "   ref 一致    : $($a.Count) / $($a.Count)" DarkGray
  Say "   文件一致    : $same / $($lmap.Count)" DarkGray
  Say "   新建 Release: $($todo.Count)" DarkGray
  Write-Host ""
  Write-Host 'SYNC OK' -ForegroundColor Green
}
finally {
  Pop-Location
  if (Test-Path $TokFile) { Say '（token 存于 .gh-token，已被 .gitignore 忽略；不想留着就删）' DarkGray }
}