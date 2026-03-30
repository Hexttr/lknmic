"""Сбор информации о сервере (без изменений)."""

from __future__ import annotations

from ssh_client import connect, run


def main() -> None:
    client = connect()
    try:
        cmds = [
            "uname -a",
            "cat /etc/os-release 2>/dev/null | head -5",
            "command -v nginx && nginx -v 2>&1 || echo 'no nginx'",
            "command -v caddy && caddy version 2>&1 || echo 'no caddy'",
            "command -v apache2 && apache2 -v 2>&1 | head -1 || echo 'no apache2'",
            "ss -tlnp 2>/dev/null | head -40 || netstat -tlnp 2>/dev/null | head -40",
            "ls -la /etc/nginx/sites-enabled 2>/dev/null || echo 'no sites-enabled'",
            "ls -la /etc/nginx/conf.d 2>/dev/null | head -20",
            "systemctl is-active nginx 2>/dev/null || true",
            "command -v node && node -v || echo 'no node'",
            "command -v pm2 && pm2 -v || echo 'no pm2'",
        ]
        for cmd in cmds:
            print(f"\n### {cmd}\n")
            code, out, err = run(client, cmd, timeout=60)
            print(out)
            if err:
                print(err)
    finally:
        client.close()


if __name__ == "__main__":
    main()
