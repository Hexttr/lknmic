"""
Deploy lk.nmiczd.ru from GitHub — set SSH_PASS in env.
Preserves .env and data/; only restarts PM2 app lk-nmiczd.

  set SSH_PASS=...  (PowerShell: $env:SSH_PASS='...')
  python scripts/ssh_deploy_lk.py
"""
import os
import sys

import paramiko

# Override: LK_SSH_HOST, LK_APP_DIR
HOST = os.environ.get("LK_SSH_HOST", "5.129.249.151")
USER = os.environ.get("LK_SSH_USER", "root")
APP = os.environ.get("LK_APP_DIR", "/var/www/lk.nmiczd.ru")
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
    pw = os.environ.get("SSH_PASS")
    if not pw:
        print("Set env SSH_PASS", file=sys.stderr)
        sys.exit(1)

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=pw, timeout=120)

    steps = [
        ("rm -rf " + CLONE, 60),
        ("git clone --depth 1 " + REPO + " " + CLONE, 120),
        (
            "rsync -a --exclude node_modules --exclude .next --exclude .git "
            "--exclude .env --exclude data --exclude dev.db "
            + CLONE
            + "/ "
            + APP
            + "/",
            120,
        ),
        ("cd " + APP + " && npm ci", 600),
        ("cd " + APP + " && npx prisma migrate deploy", 120),
        ("cd " + APP + " && npm run build", 600),
        ("pm2 restart lk-nmiczd --update-env", 60),
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
