#!/usr/bin/env python3
import argparse
from datetime import datetime

import paramiko


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a MySQL backup on the remote exam server.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--db-host", default="127.0.0.1")
    parser.add_argument("--db-port", default="13306")
    parser.add_argument("--db-name", default="exam_db")
    parser.add_argument("--db-user", default="exam_user")
    parser.add_argument("--db-password", default="exam_pass")
    parser.add_argument("--backup-dir", default="/mnt/ai-workspace/exam_releases/db_backups")
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_file = f"{args.backup_dir.rstrip('/')}/exam-db-{timestamp}.sql.gz"
    dump_cmd = (
        f"mysqldump -h {args.db_host} -P {args.db_port} -u{args.db_user} -p{args.db_password} "
        f"--single-transaction --quick --no-tablespaces {args.db_name}"
    )
    command = (
        "bash -lc "
        + repr(
            f"set -euo pipefail; "
            f"mkdir -p {args.backup_dir} && "
            f"{dump_cmd} | gzip > {backup_file}"
        )
    )

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(args.host, port=args.port, username=args.user, password=args.password, timeout=30)
    try:
        stdin, stdout, stderr = client.exec_command(command, get_pty=True)
        out = stdout.read().decode("utf-8", "ignore")
        err = stderr.read().decode("utf-8", "ignore")
        if out:
            print(out)
        if err:
            print("[stderr]")
            print(err)
        code = stdout.channel.recv_exit_status()
        if code != 0:
            raise SystemExit(code)
        print(f"Backup completed: {backup_file}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
