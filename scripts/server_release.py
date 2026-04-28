#!/usr/bin/env python3
import argparse
import os
import posixpath
import shlex
import tarfile
from datetime import datetime
from pathlib import Path

import paramiko


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = "deploy-exam.tar.gz"
TOP_LEVEL_ITEMS = [
    "backend",
    "frontend",
    "infra",
    "README.md",
    "plan.md",
    ".env.example",
    "Makefile",
    "scripts",
]
EXCLUDE_PARTS = {
    "backend/node_modules",
    "frontend/node_modules",
    "backend/dist",
    "frontend/dist",
    ".git",
    ".playwright-mcp",
    "scripts/__pycache__",
}
EXCLUDE_NAMES = {
    "deploy-exam.tar.gz",
    "exam-gpt-deploy.tar.gz",
}


def build_release_archive(output_path: Path) -> None:
    if output_path.exists():
        output_path.unlink()

    with tarfile.open(output_path, "w:gz") as tar:
        for rel in TOP_LEVEL_ITEMS:
            path = REPO_ROOT / rel
            if path.is_dir():
                for current_root, dirs, files in os.walk(path):
                    current_path = Path(current_root)
                    rel_path = current_path.relative_to(REPO_ROOT).as_posix()
                    dirs[:] = [
                        d
                        for d in dirs
                        if f"{rel_path}/{d}" not in EXCLUDE_PARTS and d != ".git"
                    ]
                    for file_name in files:
                        file_path = current_path / file_name
                        rel_file = file_path.relative_to(REPO_ROOT).as_posix()
                        if any(
                            rel_file == part or rel_file.startswith(part + "/")
                            for part in EXCLUDE_PARTS
                        ):
                            continue
                        if file_name in EXCLUDE_NAMES:
                            continue
                        tar.add(file_path, arcname=rel_file)
            elif path.exists():
                tar.add(path, arcname=path.relative_to(REPO_ROOT).as_posix())


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

    def upload(self, local_path: Path, remote_path: str) -> None:
        self.sftp.put(str(local_path), remote_path)


def ensure_remote_dirs(remote: Remote, *paths: str) -> None:
    code, out, err = remote.run(f"mkdir -p {' '.join(paths)}")
    if code != 0:
        raise RuntimeError(f"failed to create remote directories:\n{out}\n{err}")


def run_with_remote_log(remote: Remote, command: str, log_path: str, error_message: str) -> tuple[str, str]:
    wrapped = f"{{ {command}; }} 2>&1 | tee {shlex.quote(log_path)}"
    code, out, err = remote.run(wrapped)
    if code != 0:
        raise RuntimeError(f"{error_message}\nLog: {log_path}\n{out}\n{err}")
    return out, err


def deploy(args: argparse.Namespace) -> None:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_path = REPO_ROOT / PACKAGE_NAME
    build_release_archive(archive_path)

    remote = Remote(args.host, args.user, args.password, args.port)
    try:
        project_dir = args.project_dir.rstrip("/")
        project_parent = posixpath.dirname(project_dir)
        project_name = posixpath.basename(project_dir)
        release_root = args.release_root.rstrip("/")
        upload_dir = posixpath.join(release_root, "uploads")
        backup_dir = posixpath.join(release_root, "backups")
        log_dir = posixpath.join(release_root, "logs")
        remote_archive = posixpath.join(upload_dir, f"{project_name}-{timestamp}.tar.gz")
        backup_archive = posixpath.join(backup_dir, f"{project_name}-{timestamp}.tar.gz")
        deploy_log = posixpath.join(log_dir, f"{project_name}-deploy-{timestamp}.log")

        ensure_remote_dirs(remote, upload_dir, backup_dir, log_dir, project_dir)

        remote.upload(archive_path, remote_archive)

        code, out, err = remote.run(
            f"if [ -d {project_dir} ]; then tar -czf {backup_archive} -C {project_parent} {project_name}; fi"
        )
        if code != 0:
            raise RuntimeError(f"failed to create backup archive:\n{out}\n{err}")

        cleanup_targets = " ".join(TOP_LEVEL_ITEMS)
        code, out, err = remote.run(
            f"cd {project_dir} && rm -rf {cleanup_targets} && tar -xzf {remote_archive}"
        )
        if code != 0:
            raise RuntimeError(f"failed to extract release:\n{out}\n{err}")

        compose_cmd = (
            f"cd {project_dir}/infra && "
            f"{args.compose_cmd} --env-file .env up -d --build {args.services}"
        )
        run_with_remote_log(remote, compose_cmd, deploy_log, "failed to deploy services")

        print(
            f"Deploy completed.\nBackup: {backup_archive}\nArchive: {remote_archive}\nDeploy log: {deploy_log}"
        )
    finally:
        remote.close()


def rollback(args: argparse.Namespace) -> None:
    remote = Remote(args.host, args.user, args.password, args.port)
    try:
        project_dir = args.project_dir.rstrip("/")
        project_parent = posixpath.dirname(project_dir)
        project_name = posixpath.basename(project_dir)
        backup_dir = posixpath.join(args.release_root.rstrip("/"), "backups")
        log_dir = posixpath.join(args.release_root.rstrip("/"), "logs")
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        rollback_log = posixpath.join(log_dir, f"{project_name}-rollback-{timestamp}.log")

        ensure_remote_dirs(remote, backup_dir, log_dir)

        backup_name = args.backup
        if not backup_name:
            code, out, err = remote.run(f"ls -1t {backup_dir} | head -n 1")
            if code != 0 or not out.strip():
                raise RuntimeError(f"failed to resolve latest backup:\n{out}\n{err}")
            backup_name = out.strip()

        backup_archive = posixpath.join(backup_dir, backup_name)
        code, out, err = remote.run(
            f"rm -rf {project_dir} && mkdir -p {project_parent} && tar -xzf {backup_archive} -C {project_parent}"
        )
        if code != 0:
            raise RuntimeError(f"failed to restore backup:\n{out}\n{err}")

        compose_cmd = (
            f"cd {project_dir}/infra && "
            f"{args.compose_cmd} --env-file .env up -d --build {args.services}"
        )
        run_with_remote_log(
            remote,
            compose_cmd,
            rollback_log,
            "failed to restart services after rollback",
        )

        print(f"Rollback completed from backup: {backup_archive}\nRollback log: {rollback_log}")
    finally:
        remote.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy or rollback the exam project on a remote server.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--project-dir", default="/mnt/ai-workspace/exam")
    parser.add_argument("--release-root", default="/mnt/ai-workspace/exam_releases")
    parser.add_argument("--compose-cmd", default="docker-compose")
    parser.add_argument("--services", default="backend frontend")

    subparsers = parser.add_subparsers(dest="action", required=True)
    deploy_parser = subparsers.add_parser("deploy")
    deploy_parser.set_defaults(func=deploy)

    rollback_parser = subparsers.add_parser("rollback")
    rollback_parser.add_argument("--backup", help="Specific backup file name under the remote backups directory.")
    rollback_parser.set_defaults(func=rollback)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
