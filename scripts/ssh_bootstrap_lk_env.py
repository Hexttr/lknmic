"""Минимальный .env для /var/www/lk.nmiczd.ru, если файла ещё нет (как ssh_bootstrap_ava_env)."""
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

import os

import paramiko

from deploy_env import load_deploy_env


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    load_deploy_env()
    pw = os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS", file=sys.stderr)
        sys.exit(1)
    host = os.environ.get("LK_SSH_HOST", "5.129.249.151")
    user = os.environ.get("LK_SSH_USER", "root")
    app = os.environ.get("LK_APP_DIR", "/var/www/lk.nmiczd.ru")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=120)

    cmd = f"""cd {app} && mkdir -p data/uploads && if [ ! -f .env ]; then
  s=$(openssl rand -hex 32)
  printf '%s\\n' 'DATABASE_URL=file:./data/prod.db' 'NODE_ENV=production' "SESSION_SECRET=$s" > .env
  echo created
else
  echo exists
fi"""
    stdin, stdout, stderr = c.exec_command(cmd, timeout=30)
    o = stdout.read().decode(errors="replace")
    e = stderr.read().decode(errors="replace")
    print(o + e, end="")
    code = stdout.channel.recv_exit_status()
    c.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
