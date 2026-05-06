"""
Деплой ava.nmiczd.ru: clone GitHub → rsync (сохраняет .env и data/) → build → PM2.

  python scripts/ssh_deploy_ava.py

Переменные: AVA_SSH_HOST, AVA_SSH_USER, AVA_APP_DIR (по умолчанию /var/www/ava.nmiczd.ru),
AVA_REPO (по умолчанию тот же что у lk), SSH_PASS.
"""
import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from deploy_env import load_deploy_env
from ssh_remote import connect, run

HOST = os.environ.get("AVA_SSH_HOST", "178.170.165.72")
USER = os.environ.get("AVA_SSH_USER", "user_adm")
APP = os.environ.get("AVA_APP_DIR", "/var/www/ava.nmiczd.ru")
CLONE = "/tmp/avanmic-deploy-src"
REPO = os.environ.get("AVA_REPO", "https://github.com/Hexttr/lknmic.git")


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    load_deploy_env()
    if not os.environ.get("SSH_PASS"):
        print("Set env SSH_PASS", file=sys.stderr)
        sys.exit(1)

    os.environ["AVA_SSH_HOST"] = HOST
    os.environ["AVA_SSH_USER"] = USER

    c = connect(host=HOST, username=USER)

    pm2_or_start = (
        f"cd {APP} && "
        f"(pm2 describe ava-nmiczd >/dev/null 2>&1 && pm2 restart ava-nmiczd --update-env "
        f"|| pm2 start ecosystem.ava.config.cjs) && pm2 save"
    )

    steps = [
        ("rm -rf " + CLONE, 60),
        ("git clone --depth 1 " + REPO + " " + CLONE, 180),
        (
            "rsync -a --exclude node_modules --exclude .next --exclude .git "
            "--exclude .env --exclude data --exclude dev.db "
            + CLONE
            + "/ "
            + APP
            + "/",
            180,
        ),
        ("cd " + APP + " && npm ci", 900),
        ("cd " + APP + " && npx prisma migrate deploy", 180),
        ("cd " + APP + " && npm run build", 900),
        (pm2_or_start, 120),
    ]

    for cmd, tmo in steps:
        code = run(c, cmd, timeout=tmo)
        if code != 0:
            print(f"\nFAILED exit {code}", file=sys.stderr)
            c.close()
            sys.exit(code)

    run(c, "pm2 show ava-nmiczd 2>/dev/null | head -30", 30)
    c.close()
    print("\nDeploy ava OK.")


if __name__ == "__main__":
    main()
