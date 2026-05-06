"""
Deploy lk.nmiczd.ru from GitHub — SSH_PASS из окружения или из deploy/.env.
Preserves .env and data/; only restarts PM2 app lk-nmiczd.

  python scripts/ssh_deploy_lk.py

Либо: $env:SSH_PASS='...' перед запуском (перекрывает deploy/.env).
"""
import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

import paramiko

from deploy_env import load_deploy_env

CLONE = "/tmp/lknmic-deploy-src"
REPO = "https://github.com/Hexttr/lknmic.git"


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 600) -> int:
    print(f"\n>>> {cmd[:200]}{'...' if len(cmd) > 200 else ''}\n", flush=True)
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
    load_deploy_env()
    pw = os.environ.get("SSH_PASS")
    if not pw:
        print("Set env SSH_PASS", file=sys.stderr)
        sys.exit(1)

    host = os.environ.get("LK_SSH_HOST", "5.129.249.151")
    user = os.environ.get("LK_SSH_USER", "root")
    app = os.environ.get("LK_APP_DIR", "/var/www/lk.nmiczd.ru")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=120)

    pm2_or_start = (
        f"cd {app} && "
        f"(pm2 describe lk-nmiczd >/dev/null 2>&1 && pm2 restart lk-nmiczd --update-env "
        f"|| pm2 start ecosystem.config.cjs) && pm2 save"
    )

    steps = [
        ("rm -rf " + CLONE, 60),
        ("git clone --depth 1 " + REPO + " " + CLONE, 120),
        (
            "rsync -a --exclude node_modules --exclude .next --exclude .git "
            "--exclude .env --exclude data --exclude dev.db "
            + CLONE
            + "/ "
            + app
            + "/",
            120,
        ),
        ("cd " + app + " && npm ci", 600),
        ("cd " + app + " && npx prisma migrate deploy", 120),
        ("cd " + app + " && npm run build", 600),
        (pm2_or_start, 120),
    ]

    for cmd, tmo in steps:
        code = run(c, cmd, timeout=tmo)
        if code != 0:
            print(f"\nFAILED exit {code}", file=sys.stderr)
            c.close()
            sys.exit(code)

    run(c, "pm2 show lk-nmiczd 2>/dev/null | head -25", 30)
    c.close()
    print("\nDeploy OK.")


if __name__ == "__main__":
    main()
