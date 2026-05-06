"""
Let's Encrypt для ava.nmiczd.ru (nginx). Нужен SSH_PASS и SUDO_PASS (или тот же пароль).

Требование: DNS A запись ava.nmiczd.ru указывает на IP **этого** сервера (AVA_SSH_HOST).

  python scripts/ssh_certbot_ava.py

Опционально: CERTBOT_EMAIL (по умолчанию webmaster@nmiczd.ru).
"""
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

    email = os.environ.get("CERTBOT_EMAIL", "webmaster@nmiczd.ru")
    c = connect()

    cmd = (
        "certbot --nginx -d ava.nmiczd.ru --non-interactive --agree-tos "
        f"--email {email} --redirect"
    )
    code = sudo_run(c, pw, cmd, timeout=300)
    c.close()
    if code != 0:
        print(f"\ncertbot exit {code} — проверьте DNS (A → этот сервер) и порт 80.", file=sys.stderr)
        sys.exit(code)
    print("\nHTTPS OK.")


if __name__ == "__main__":
    main()
