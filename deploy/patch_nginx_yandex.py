"""Патч nginx: отдавать верификационный файл напрямую (Next 16 отдаёт 404 для .html в public)."""
from __future__ import annotations

import io
import os
import sys

import paramiko

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
    )

NGINX_PATH = "/etc/nginx/sites-available/lk.nmiczd.ru"
BLOCK = """
    location = /yandex_8d202f10c2495847.html {
        alias /var/www/lk.nmiczd.ru/public/yandex_8d202f10c2495847.html;
        default_type text/html;
        charset utf-8;
    }

"""


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
        timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )
    try:
        sftp = client.open_sftp()
        with sftp.open(NGINX_PATH, "r") as f:
            text = f.read().decode("utf-8")
        if "yandex_8d202f10c2495847" in text:
            print("nginx: блок уже есть")
        else:
            old = "    server_name lk.nmiczd.ru;\n\n    location / {"
            if old not in text:
                print("pattern not found", file=sys.stderr)
                sys.exit(1)
            text = text.replace(old, "    server_name lk.nmiczd.ru;\n" + BLOCK + "\n    location / {", 1)
            with sftp.open(NGINX_PATH, "w") as f:
                f.write(text.encode("utf-8"))
            print("nginx: записан патч")
        sftp.close()

        stdin, stdout, stderr = client.exec_command(
            "nginx -t && systemctl reload nginx", timeout=30
        )
        out = stdout.read().decode()
        err = stderr.read().decode()
        print(out, end="")
        if err:
            print(err, file=sys.stderr)
        code = stdout.channel.recv_exit_status()
        sys.exit(code)
    finally:
        client.close()


if __name__ == "__main__":
    main()
