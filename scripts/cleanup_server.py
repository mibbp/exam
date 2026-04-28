#!/usr/bin/env python3
import argparse
import posixpath
import shlex
import stat
from dataclasses import dataclass
from datetime import datetime

import paramiko


@dataclass
class CleanupTarget:
    label: str
    path: str
    keep: int


class Remote:
    def __init__(self, host: str, username: str, password: str, port: int = 22) -> None:
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.client.connect(host, port=port, username=username, password=password, timeout=30)
        self.sftp = self.client.open_sftp()

    def close(self) -> None:
        self.sftp.close()
        self.client.close()

    def run(self, command: str) -> tuple[int, str, str]:
        stdin, stdout, stderr = self.client.exec_command(command, get_pty=True)
        out = stdout.read().decode("utf-8", "ignore")
        err = stderr.read().decode("utf-8", "ignore")
        code = stdout.channel.recv_exit_status()
        return code, out, err


def format_ts(ts: float) -> str:
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")


def cleanup_target(remote: Remote, target: CleanupTarget, apply: bool) -> tuple[int, int]:
    try:
        entries = remote.sftp.listdir_attr(target.path)
    except FileNotFoundError:
        print(f"[skip] {target.label}: directory not found -> {target.path}")
        return 0, 0
    except OSError as exc:
        print(f"[error] {target.label}: failed to read {target.path}: {exc}")
        return 0, 0

    entries.sort(key=lambda item: (item.st_mtime, item.filename), reverse=True)
    kept = entries[: max(target.keep, 0)]
    removed = entries[max(target.keep, 0) :]

    print(f"\n== {target.label} ==")
    print(f"path: {target.path}")
    print(f"total: {len(entries)}, keep: {len(kept)}, delete: {len(removed)}")

    if not removed:
        return len(kept), 0

    action = "delete" if apply else "would delete"
    for item in removed:
        kind = "dir" if stat.S_ISDIR(item.st_mode) else "file"
        full_path = posixpath.join(target.path, item.filename)
        print(f"  - [{action}] {kind} {item.filename} (mtime: {format_ts(item.st_mtime)})")
        if apply:
            cmd = f"rm -rf -- {shlex.quote(full_path)}"
            code, out, err = remote.run(cmd)
            if code != 0:
                raise RuntimeError(
                    f"failed to delete {full_path}\nexit_code={code}\nstdout={out}\nstderr={err}"
                )

    return len(kept), len(removed)


def build_targets(args: argparse.Namespace) -> list[CleanupTarget]:
    root = args.release_root.rstrip("/")
    return [
        CleanupTarget("release backups", posixpath.join(root, "backups"), args.keep_backups),
        CleanupTarget("release logs", posixpath.join(root, "logs"), args.keep_logs),
        CleanupTarget("release uploads", posixpath.join(root, "uploads"), args.keep_uploads),
        CleanupTarget("db backups", posixpath.join(root, "db_backups"), args.keep_db_backups),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Cleanup old release artifacts on a remote exam server.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--release-root", default="/mnt/ai-workspace/exam_releases")
    parser.add_argument("--keep-backups", type=int, default=10)
    parser.add_argument("--keep-logs", type=int, default=20)
    parser.add_argument("--keep-uploads", type=int, default=10)
    parser.add_argument("--keep-db-backups", type=int, default=10)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete old files. Default is dry-run.",
    )
    args = parser.parse_args()

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"[cleanup] mode={mode}, host={args.host}, release_root={args.release_root}")

    remote = Remote(args.host, args.user, args.password, args.port)
    try:
        targets = build_targets(args)
        total_keep = 0
        total_delete = 0
        for target in targets:
            kept, removed = cleanup_target(remote, target, args.apply)
            total_keep += kept
            total_delete += removed

        print("\n== summary ==")
        print(f"kept entries: {total_keep}")
        print(f"{'deleted' if args.apply else 'would delete'} entries: {total_delete}")
    finally:
        remote.close()


if __name__ == "__main__":
    main()
