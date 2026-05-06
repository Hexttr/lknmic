"""Let's Encrypt для lk.nmiczd.ru (nginx). SSH_PASS, SUDO_PASS при необходимости."""

import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

import paramiko

from deploy_env import load_deploy_env
from ssh_remote import sudo_run


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    load_deploy_env()
    pw = os.environ.get("SUDO_PASS") or os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS", file=sys.stderr)
        sys.exit(1)

    host = os.environ.get("LK_SSH_HOST", "5.129.249.151")
    user = os.environ.get("LK_SSH_USER", "root")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=os.environ["SSH_PASS"], timeout=120)

    email = os.environ.get("CERTBOT_EMAIL", "webmaster@nmiczd.ru")
    cmd = (
        "certbot --nginx -d lk.nmiczd.ru --non-interactive --agree-tos "
        f"--email {email} --redirect"
    )
    code = sudo_run(c, pw, cmd, timeout=300)
    c.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
