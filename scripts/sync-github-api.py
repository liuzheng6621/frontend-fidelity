#!/usr/bin/env python3
"""把当前提交同步到 GitHub 镜像：master + tag + Release + 附件，并校验 tree 一致。

为什么不用 `git push`：本机 Git 走 schannel，推 GitHub 报
`CRYPT_E_NO_REVOCATION_CHECK`；换 openssl 后端又缺根证书（`unable to get local
issuer certificate`），补 ca-bundle 后报 `error adding trust anchors`。三条路都断，
所以走 Git Data API 建对象、挪 ref。

三条必须守住的规则（踩过）：
  1. blob 内容取 `git cat-file blob <sha>`，**不要读工作树**——工作树是 CRLF、
     仓库里是 LF，直接传会得到不同 sha，tree 接口报 `is not a valid blob`。
  2. mode 取 `git ls-tree -r HEAD`，**不要按扩展名猜**——猜成 100755 会让 tree sha
     对不上（内容一样也不相等）。
  3. 验收口径是 **tree sha 相等**，不是 commit sha——API 造的 commit 与本地 sha
     必然不同（committer 信息不一样）。

用法：
  python scripts/sync-github-api.py                      # 用最新的 tag，正文取 CHANGELOG
  python scripts/sync-github-api.py --tag v1.30.0 --prev v1.29.0
  python scripts/sync-github-api.py --dry-run            # 只打印要做的事
  python scripts/sync-github-api.py --skip-release       # 只推代码和 tag
  python scripts/sync-github-api.py --repo liuzheng6621/frontend-fidelity

Token 顺序：--token → 环境变量 GH_TOKEN → 仓库根 .gh-token（已被 .gitignore 忽略）。
需要的权限：Contents: Read and write。
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

DEFAULT_REPO = "liuzheng6621/frontend-fidelity"


def sh(*args: str, binary: bool = False) -> str | bytes:
    out = subprocess.run(args, capture_output=True, check=True).stdout
    return out if binary else out.decode("utf-8", "replace").strip()


def git(*args: str) -> str:
    return sh("git", *args)  # type: ignore[return-value]


def git_blob(sha: str) -> bytes:
    return sh("git", "cat-file", "blob", sha, binary=True)  # type: ignore[return-value]


class Api:
    def __init__(self, token: str, repo: str, dry: bool = False) -> None:
        self.token = token
        self.repo = repo
        self.base = f"https://api.github.com/repos/{repo}"
        self.dry = dry

    def __call__(self, method: str, url: str, payload=None, raw: bytes | None = None,
                 ctype: str = "application/json", timeout: int = 180):
        if self.dry and method != "GET":
            # 只读请求照跑（要拿基线 sha），写请求一律跳过
            print(f"  [dry-run] {method} {url}")
            return {"sha": "0" * 40, "id": 0, "name": "dry-run", "size": 0}
        data = raw if raw is not None else (json.dumps(payload).encode() if payload is not None else None)
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": ctype,
            "User-Agent": "frontend-fidelity-sync",
        })
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:600]
            raise SystemExit(f"HTTP {e.code} {method} {url}\n{detail}") from e


def resolve_token(cli_token: str | None) -> str:
    if cli_token:
        return cli_token
    env = os.environ.get("GH_TOKEN")
    if env:
        return env.strip()
    path = pathlib.Path(".gh-token")
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    raise SystemExit("缺少 token：--token / $GH_TOKEN / 仓库根 .gh-token 三选一")


def release_body(tag: str, changelog: pathlib.Path) -> str:
    if not changelog.exists():
        return tag
    text = changelog.read_text(encoding="utf-8")
    m = re.search(rf"## {re.escape(tag)}[^\n]*\n(.*?)(?=\n## v|\Z)", text, re.S)
    return m.group(1).strip() if m else tag


def main() -> int:
    ap = argparse.ArgumentParser(description="用 Git Data API 同步到 GitHub 镜像")
    ap.add_argument("--repo", default=DEFAULT_REPO, help=f"owner/name，默认 {DEFAULT_REPO}")
    ap.add_argument("--tag", help="要发的 tag（默认取最新 tag）")
    ap.add_argument("--prev", help="上一次同步的起点（默认取倒数第二个 tag）")
    ap.add_argument("--token")
    ap.add_argument("--asset", default="dist/frontend-fidelity.zip")
    ap.add_argument("--changelog", default="CHANGELOG.md")
    ap.add_argument("--skip-release", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    tags = git("tag", "--sort=-v:refname").splitlines()
    if not tags:
        raise SystemExit("本地没有任何 tag，先 git tag")
    tag = args.tag or tags[0]
    prev = args.prev or (tags[1] if len(tags) > 1 else None)
    if prev is None:
        raise SystemExit("只有一个 tag，无法确定增量起点；用 --prev 指定")

    local_tree = git("rev-parse", f"{tag}^{{tree}}")
    message = git("log", "-1", "--pretty=%B", tag)
    print(f"同步 {tag}（起点 {prev}）")
    print(f"  本地 tree: {local_tree[:12]}")

    api = Api(resolve_token(args.token), args.repo, args.dry_run)

    # 1) 基线
    base_commit = api("GET", f"{api.base}/git/ref/heads/master")["object"]["sha"]
    base_tree = api("GET", f"{api.base}/git/commits/{base_commit}")["tree"]["sha"]
    print(f"  GitHub master: {base_commit[:12]}")

    # 2) 本地 mode / sha 表
    modes: dict[str, tuple[str, str]] = {}
    for line in git("ls-tree", "-r", "HEAD").splitlines():
        meta, path = line.split("\t", 1)
        mode, _type, sha = meta.split()
        modes[path] = (mode, sha)

    # 3) 逐文件建 blob（内容取 git 对象，不取工作树）
    changed = git("diff", "--name-status", f"{prev}..{tag}").splitlines()
    entries = []
    for line in changed:
        status, path = line.split("\t", 1)
        mode, sha = modes[path]
        if status.startswith("D"):
            entries.append({"path": path, "mode": mode, "type": "blob", "sha": None})
            continue
        blob = api("POST", f"{api.base}/git/blobs", {
            "content": base64.b64encode(git_blob(sha)).decode(),
            "encoding": "base64",
        })
        if not args.dry_run and blob["sha"] != sha:
            raise SystemExit(f"blob sha 不一致：{path}（本地 {sha[:10]} / 远端 {blob['sha'][:10]}）")
        entries.append({"path": path, "mode": mode, "type": "blob", "sha": blob["sha"]})
    print(f"  blob: {len(entries)} 个")

    # 4) tree + commit + ref
    tree = api("POST", f"{api.base}/git/trees", {"base_tree": base_tree, "tree": entries})
    if not args.dry_run and tree["sha"] != local_tree:
        raise SystemExit(f"tree 不一致：远端 {tree['sha']} / 本地 {local_tree}——检查 mode 与 CRLF")
    commit = api("POST", f"{api.base}/git/commits", {
        "message": message, "tree": tree["sha"], "parents": [base_commit],
    })
    api("PATCH", f"{api.base}/git/refs/heads/master", {"sha": commit["sha"], "force": True})
    tag_obj = api("POST", f"{api.base}/git/tags", {
        "tag": tag, "message": message.splitlines()[0], "object": commit["sha"], "type": "commit",
    })
    api("POST", f"{api.base}/git/refs", {"ref": f"refs/tags/{tag}", "sha": tag_obj["sha"]})
    print(f"  tree 一致 ✓ · master 与 {tag} 已更新")

    if args.skip_release:
        return 0

    # 5) Release + 附件
    rel = api("POST", f"{api.base}/releases", {
        "tag_name": tag,
        "target_commitish": "master",
        "name": message.splitlines()[0],
        "body": release_body(tag, pathlib.Path(args.changelog)),
        "draft": False,
        "prerelease": False,
    })
    asset_path = pathlib.Path(args.asset)
    if not asset_path.exists():
        print(f"  跳过附件：{asset_path} 不存在（先 git archive 生成）")
        return 0
    asset = api(
        "POST",
        f"https://uploads.github.com/repos/{args.repo}/releases/{rel['id']}/assets?name={asset_path.name}",
        raw=asset_path.read_bytes(),
        ctype="application/zip",
    )
    if not args.dry_run:
        print(f"  Release {rel['id']} · 附件 {asset['name']} {asset['size'] // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
