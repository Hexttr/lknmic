"""Один раз: systemd автозапуск PM2 для user_adm (нужен SUDO_PASS или SSH_PASS)."""
import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from ssh_remote import connect, sudo_run


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    pw = os.environ.get("SUDO_PASS") or os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS", file=sys.stderr)
        sys.exit(1)
    c = connect()
    cmd = "env PATH=$PATH:/usr/bin pm2 startup systemd -u user_adm --hp /home/user_adm"
    code = sudo_run(c, pw, cmd, timeout=120)
    c.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
