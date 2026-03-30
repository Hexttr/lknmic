"""SSH helper via paramiko. Credentials only from environment — never commit secrets."""

from __future__ import annotations

import io
import os
import sys
from typing import Optional

import paramiko

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
    )
if hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True
    )


def connect() -> paramiko.SSHClient:
    host = os.environ.get("SSH_HOST", "5.129.249.151")
    user = os.environ.get("SSH_USER", "root")
    password = os.environ.get("SSH_PASSWORD")
    if not password:
        print(
            "Set SSH_PASSWORD (and optionally SSH_HOST, SSH_USER).",
            file=sys.stderr,
        )
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=user,
        password=password,
        timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )
    return client


def run(
    client: paramiko.SSHClient,
    command: str,
    *,
    timeout: Optional[int] = 120,
) -> tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return exit_code, out, err


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python ssh_client.py '<remote command>'", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    client = connect()
    try:
        code, out, err = run(client, cmd)
        if out:
            print(out, end="")
        if err:
            print(err, end="", file=sys.stderr)
        sys.exit(code)
    finally:
        client.close()


if __name__ == "__main__":
    main()
