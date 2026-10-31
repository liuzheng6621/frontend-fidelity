#!/usr/bin/env bash
# frontend-fidelity 技能安装器（macOS / Linux / Windows 的 Git Bash）
#
# 用法：
#   curl -fsSL https://gitee.com/liu-everything_impossble/skill-frontend-fidelity/raw/master/install.sh | bash
#   bash install.sh --target claude          # 只装到 ~/.claude/skills
#   bash install.sh --target dsh             # 只装到 ~/.dsh/skills
#   bash install.sh --dir ~/my-skills        # 装到自定义目录
#   bash install.sh --ref v1.17.0            # 装某个 tag
#   bash install.sh --dry-run                # 只看会装到哪，不动文件
#
# 可用环境变量覆盖：FF_REPO / FF_REF / FF_TARGET
set -euo pipefail

REPO="${FF_REPO:-https://gitee.com/liu-everything_impossble/skill-frontend-fidelity.git}"
REF="${FF_REF:-master}"
TARGET="${FF_TARGET:-both}"
DEST=""
NAME="frontend-fidelity"
DRY=0

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:?--target 需要值}"; shift 2 ;;
    --dir)    DEST="${2:?--dir 需要值}";    shift 2 ;;
    --ref)    REF="${2:?--ref 需要值}";     shift 2 ;;
    --repo)   REPO="${2:?--repo 需要值}";   shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$1" >&2; usage >&2; exit 2 ;;
  esac
done

# 要装的文件（不含 .git / 截图 / 产物）
FILES="SKILL.md README.md LICENSE CHANGELOG.md .gitattributes package.json references scripts docs install.sh install.ps1"

resolve_dests() {
  if [ -n "$DEST" ]; then echo "$DEST"; return; fi
  case "$TARGET" in
    claude) echo "$HOME/.claude/skills" ;;
    dsh)    echo "$HOME/.dsh/skills" ;;
    both)   echo "$HOME/.claude/skills"; echo "$HOME/.dsh/skills" ;;
    *) echo "错误：--target 只能是 claude / dsh / both" >&2; exit 2 ;;
  esac
}

echo "frontend-fidelity 安装器"
echo "  仓库：$REPO"
echo "  版本：$REF"
echo "  目标：$(resolve_dests | tr '\n' ' ')"

if [ "$DRY" -eq 1 ]; then
  for base in $(resolve_dests); do echo "  [dry-run] 将写入 $base/$NAME"; done
  exit 0
fi

tmp="$(mktemp -d 2>/dev/null || mktemp -d -t ffs)"
trap 'rm -rf "$tmp"' EXIT
echo "→ 拉取源码"
if command -v git >/dev/null 2>&1; then
  if ! git clone --depth 1 --branch "$REF" "$REPO" "$tmp/src" >/dev/null 2>&1; then
    git clone --depth 1 "$REPO" "$tmp/src" >/dev/null 2>&1 || { echo "git clone 失败：$REPO" >&2; exit 1; }
  fi
else
  base="${REPO%.git}"
  # tag（v 开头）走发布包；分支/主干走源码归档包（发布包里没有 master 这种名字）
  case "$REF" in
    v*) url="$base/releases/download/$REF/frontend-fidelity.zip" ;;
    *)  case "$base" in
          *gitee.com/*) url="$base/repository/archive/$REF.zip" ;;
          *)            url="$base/archive/$REF.zip" ;;
        esac ;;
  esac
  echo "  （没有 git，改用它：$url）"
  curl -fsSL "$url" -o "$tmp/pkg.zip" || { echo "下载失败：$url" >&2; exit 1; }
  command -v unzip >/dev/null 2>&1 || { echo "需要 unzip 解包，或改装 git 后重试" >&2; exit 1; }
  ( cd "$tmp" && unzip -q pkg.zip )
  # 归档包与发布包的顶层目录名不同（skill-xxx-master / frontend-fidelity），取唯一的那个
  top="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d ! -name src | head -n 1)"
  [ -n "$top" ] || { echo "解包后没找到目录：$url" >&2; exit 1; }
  mv "$top" "$tmp/src"
fi

for base in $(resolve_dests); do
  dest="$base/$NAME"
  mkdir -p "$base"
  rm -rf "$dest"
  mkdir -p "$dest"
  for f in $FILES; do
    [ -e "$tmp/src/$f" ] && cp -R "$tmp/src/$f" "$dest/"
  done
  echo "✓ 已安装到 $dest"
done

echo
echo "下一步："
echo "  · Claude Code：在项目里说「照这张截图还原页面」，或运行 /skills 查看"
echo "  · DSH：新开一个会话即可看到 frontend-fidelity（旧会话不重新加载技能）"
echo "  · 自检：node \"$dest/scripts/audit.mjs\" --url <your-url>"