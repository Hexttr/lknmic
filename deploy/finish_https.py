"""После появления DNS A-записи lk.nmiczd.ru → IP сервера — выпустить сертификат."""

from __future__ import annotations

import io
import os
import sys

import paramiko

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
    )


def main() -> None:
    password = os.environ.get("SSH_PASSWORD")
    if not password:
        print("Set SSH_PASSWORD", file=sys.stderr)
        sys.exit(1)
    host = os.environ.get("SSH_HOST", "5.129.249.151")
    user = os.environ.get("SSH_USER", "root")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=user,
        password=password,
        timeout=60,
        allow_agent=False,
        look_for_keys=False,
    )
    try:
        cmd = (
            "certbot --nginx -d lk.nmiczd.ru --non-interactive --agree-tos "
            "--register-unsafely-without-email --redirect && nginx -t && systemctl reload nginx"
        )
        stdin, stdout, stderr = client.exec_command(cmd, timeout=180)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err:
            print(err, file=sys.stderr)
        code = stdout.channel.recv_exit_status()
        sys.exit(code)
    finally:
        client.close()


if __name__ == "__main__":
    main()
