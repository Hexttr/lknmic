"""
Первичная подготовка сервера ava.nmiczd.ru (Ubuntu): Node, nginx, pm2, ufw, сайт HTTP.
Пароль: SSH_PASS (и для sudo — SUDO_PASS, иначе как SSH_PASS).

  python scripts/ssh_provision_ava.py

Переменные: AVA_SSH_HOST (по умолчанию 178.170.165.72), AVA_SSH_USER (user_adm).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from ssh_remote import connect, run, sudo_run


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    pw = os.environ.get("SUDO_PASS") or os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS (and optionally SUDO_PASS)", file=sys.stderr)
        sys.exit(1)

    root = _scripts.parent
    nginx_local = root / "deploy" / "nginx-ava.nmiczd.ru.conf"
    if not nginx_local.is_file():
        print(f"Missing {nginx_local}", file=sys.stderr)
        sys.exit(1)

    c = connect()
    user = os.environ.get("AVA_SSH_USER", os.environ.get("LK_SSH_USER", "user_adm"))

    bootstrap = r"""
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates nginx ufw build-essential \
  python3-certbot-nginx certbot
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
mkdir -p /var/www/ava.nmiczd.ru
chown -R __USER__:__USER__ /var/www/ava.nmiczd.ru
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true
systemctl enable nginx
systemctl start nginx
"""
    bootstrap = bootstrap.replace("__USER__", user)
    code = sudo_run(c, pw, bootstrap.strip(), timeout=1200)
    if code != 0:
        print(f"bootstrap failed exit {code}", file=sys.stderr)
        sys.exit(code)

    remote_tmp = "/tmp/ava.nmiczd.ru.nginx.conf"
    sftp = c.open_sftp()
    sftp.put(str(nginx_local), remote_tmp)
    sftp.close()

    site = r"""
set -e
cp /tmp/ava.nmiczd.ru.nginx.conf /etc/nginx/sites-available/ava.nmiczd.ru
ln -sf /etc/nginx/sites-available/ava.nmiczd.ru /etc/nginx/sites-enabled/ava.nmiczd.ru
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
"""
    code = sudo_run(c, pw, site.strip(), timeout=120)
    if code != 0:
        print(f"nginx site failed exit {code}", file=sys.stderr)
        sys.exit(code)

    run(c, "node -v && npm -v && pm2 -v", timeout=60)
    c.close()
    print("\nProvision OK. Затем: DNS A для ava.nmiczd.ru → этот сервер, .env на сервере, python scripts/ssh_deploy_ava.py, python scripts/ssh_certbot_ava.py")


if __name__ == "__main__":
    main()
