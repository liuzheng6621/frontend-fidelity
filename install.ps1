<#
.SYNOPSIS
  安装 frontend-fidelity 技能（Claude Code / DSH）
.DESCRIPTION
  默认装到 ~\.claude\skills 与 ~\.dsh\skills；-Target workbuddy 装到 ~\.workbuddy-ai\skills；-Dir 可装到别处。
.EXAMPLE
  irm https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/raw/master/install.ps1 | iex
.EXAMPLE
  .\install.ps1 -Target claude
.EXAMPLE
  .\install.ps1 -Dir D:\skills -DryRun
#>
[CmdletBinding()]
param(
  [ValidateSet('claude','dsh','workbuddy','both','all')][string]$Target = 'both',
  [string]$Dir,
  [string]$Ref = 'master',
  [string]$Repo = 'https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Name  = 'frontend-fidelity'
$items = @('SKILL.md','README.md','LICENSE','CHANGELOG.md','.gitattributes','package.json','references','scripts','docs','install.sh','install.ps1')

function Get-Bases {
  if ($Dir) { return @($Dir) }
  switch ($Target) {
    'claude' { return @(Join-Path $HOME '.claude\skills') }
    'dsh'    { return @(Join-Path $HOME '.dsh\skills') }
    'workbuddy' { return @(Join-Path $HOME '.workbuddy-ai\skills') }
    'both'   { return @((Join-Path $HOME '.claude\skills'), (Join-Path $HOME '.dsh\skills')) }
    'all'    { return @((Join-Path $HOME '.claude\skills'), (Join-Path $HOME '.dsh\skills'), (Join-Path $HOME '.workbuddy-ai\skills')) }
  }
}

$bases = Get-Bases
Write-Host 'frontend-fidelity 安装器'
Write-Host "  仓库：$Repo"
Write-Host "  版本：$Ref"
Write-Host "  目标：$($bases -join '  ')"

if ($DryRun) {
  foreach ($b in $bases) { Write-Host "  [dry-run] 将写入 $(Join-Path $b $Name)" }
  return
}

$tmp = Join-Path $env:TEMP ("ff-" + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
  $src = Join-Path $tmp 'src'
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) {
    Write-Host '→ 用 git 拉取源码'
    $ErrorActionPreference = 'Continue'
    & git clone --depth 1 --branch $Ref $Repo $src 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { & git clone --depth 1 $Repo $src 2>&1 | Out-Null }
    $cloneExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($cloneExit -ne 0) { throw "git clone 失败：$Repo" }
  } else {
    $bare = $Repo -replace '\.git$',''
    if ($bare -match 'gitee\.com/([^/]+)/([^/]+)$') {
      $url = "https://gitee.com/$($Matches[1])/$($Matches[2])/repository/archive/$Ref.zip"
    } elseif ($bare -match 'github\.com/([^/]+)/([^/]+)$') {
      $url = "https://github.com/$($Matches[1])/$($Matches[2])/archive/$Ref.zip"
    } else {
      throw "无法从 $Repo 推导下载地址，请先装 git，或用 -Repo 指定发布包地址"
    }
    Write-Host "→ 下载 $url"
    $zip = Join-Path $tmp 'pkg.zip'
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $inner = Get-ChildItem $tmp -Directory | Where-Object { $_.Name -ne 'src' } | Select-Object -First 1
    if (-not $inner) { throw '解压后找不到目录' }
    Rename-Item $inner.FullName $src
  }

  if (-not (Test-Path (Join-Path $src 'SKILL.md'))) { throw '源码里没有 SKILL.md，仓库或版本不对' }

  foreach ($base in $bases) {
    $dest = Join-Path $base $Name
    if (-not (Test-Path $base)) { New-Item -ItemType Directory -Path $base -Force | Out-Null }
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    foreach ($i in $items) {
      $p = Join-Path $src $i
      if (Test-Path $p) { Copy-Item $p -Destination $dest -Recurse -Force }
    }
    Write-Host "✓ 已安装到 $dest"
  }

  Write-Host ''
  Write-Host '下一步：'
  Write-Host '  · Claude Code：在项目里说「照这张截图还原页面」，或运行 /skills 查看'
  Write-Host '  · DSH：新开一个会话即可看到 frontend-fidelity（旧会话不重新加载技能）'
  Write-Host "  · 自检：node `"$dest\scripts\audit.mjs`" --url <your-url>"
}
finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}