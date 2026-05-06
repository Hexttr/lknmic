"""
Один раз на новом сервере: каталог /var/www/lk.nmiczd.ru, nginx lk.nmiczd.ru,
отключение vhost ava (если был), освобождение порта 3010 (pm2 delete ava-nmiczd).

Требует deploy/.env: SSH_PASS, LK_SSH_HOST, LK_SSH_USER (user_adm + sudo).

  python scripts/ssh_prepare_lk_new_host.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

import paramiko

from deploy_env import load_deploy_env
from ssh_remote import sudo_run


def connect_lk() -> tuple[paramiko.SSHClient, str, str]:
    load_deploy_env()
    pw = os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS", file=sys.stderr)
        sys.exit(1)
    host = os.environ.get("LK_SSH_HOST", "5.129.249.151")
    user = os.environ.get("LK_SSH_USER", "root")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=120)
    return c, pw, user


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120) -> int:
    print(f"\n>>> {cmd[:180]}...\n" if len(cmd) > 180 else f"\n>>> {cmd}\n", flush=True)
    _, out, err = c.exec_command(cmd, timeout=timeout)
    o = out.read().decode("utf-8", errors="replace")
    e = err.read().decode("utf-8", errors="replace")
    if o:
        print(o, end="", flush=True)
    if e:
        print(e, end="", file=sys.stderr, flush=True)
    return out.channel.recv_exit_status()


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    root = _scripts.parent
    nginx_local = root / "deploy" / "nginx-lk.nmiczd.ru.conf"
    if not nginx_local.is_file():
        print(f"Missing {nginx_local}", file=sys.stderr)
        sys.exit(1)

    c, sudo_pw, app_user = connect_lk()

    prep = f"""
set -e
mkdir -p /var/www/lk.nmiczd.ru
chown -R {app_user}:{app_user} /var/www/lk.nmiczd.ru
"""
    code = sudo_run(c, sudo_pw, prep.strip(), timeout=60)
    if code != 0:
        sys.exit(code)

    run(c, "pm2 delete ava-nmiczd 2>/dev/null || true", 30)
    run(c, "pm2 save 2>/dev/null || true", 30)

    remote_tmp = "/tmp/lk.nmiczd.ru.nginx.conf"
    sftp = c.open_sftp()
    sftp.put(str(nginx_local), remote_tmp)
    sftp.close()

    site = """
set -e
rm -f /etc/nginx/sites-enabled/ava.nmiczd.ru
cp /tmp/lk.nmiczd.ru.nginx.conf /etc/nginx/sites-available/lk.nmiczd.ru
ln -sf /etc/nginx/sites-available/lk.nmiczd.ru /etc/nginx/sites-enabled/lk.nmiczd.ru
nginx -t
systemctl reload nginx
"""
    code = sudo_run(c, sudo_pw, site.strip(), timeout=120)
    if code != 0:
        sys.exit(code)

    c.close()
    print("\nPrepare lk OK: /var/www/lk.nmiczd.ru, nginx lk.nmiczd.ru, ava PM2/site отключены при наличии.")


if __name__ == "__main__":
    main()
