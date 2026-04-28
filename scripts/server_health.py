#!/usr/bin/env python3
import argparse
import json
import textwrap

import paramiko


def main() -> None:
    parser = argparse.ArgumentParser(description="Check live exam service health on a remote server.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--base-url", default="http://127.0.0.1:18080")
    parser.add_argument("--compose-project-dir", default="/mnt/ai-workspace/exam/infra")
    args = parser.parse_args()

    script = textwrap.dedent(
        f"""
        set -e
        echo '--- containers ---'
        docker ps --format "table {{{{.Names}}}}\\t{{{{.Status}}}}\\t{{{{.Ports}}}}" | grep exam_ || true
        echo
        echo '--- compose ps ---'
        cd {args.compose_project_dir} && docker-compose --env-file .env ps
        echo
        echo '--- frontend head ---'
        curl -I -s {args.base_url}/
        echo
        echo '--- admin login + dashboard ---'
        TOKEN=$(curl -s {args.base_url}/api/auth/login -X POST -H 'Content-Type: application/json' -d '{{"username":"admin","password":"Admin@123"}}' | python -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
        curl -s {args.base_url}/api/dashboard/overview -H "Authorization: Bearer $TOKEN"
        echo
        echo
        echo '--- student login + my-exams ---'
        STOKEN=$(curl -s {args.base_url}/api/auth/login -X POST -H 'Content-Type: application/json' -d '{{"username":"student","password":"Student@123"}}' | python -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
        curl -s {args.base_url}/api/my-exams -H "Authorization: Bearer $STOKEN"
        """
    ).strip()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(args.host, port=args.port, username=args.user, password=args.password, timeout=30)
    try:
        stdin, stdout, stderr = client.exec_command(script, get_pty=True)
        out = stdout.read().decode("utf-8", "ignore")
        err = stderr.read().decode("utf-8", "ignore")
        print(out)
        if err:
            print("[stderr]")
            print(err)
        raise SystemExit(stdout.channel.recv_exit_status())
    finally:
        client.close()


if __name__ == "__main__":
    main()
