"""Run remote shell commands — password via env SSH_PASS или deploy/.env."""
import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

import paramiko

from deploy_env import load_deploy_env

HOST = "5.129.249.151"
USER = "root"
APP_DIR = "/var/www/lk.nmiczd.ru"


def run(c: paramiko.SSHClient, cmd: str) -> str:
    _, out, err = c.exec_command(cmd)
    raw = out.read() + err.read()
    return raw.decode("utf-8", errors="replace")


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    load_deploy_env()
    pw = os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS", file=sys.stderr)
        sys.exit(1)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=pw, timeout=60)
    for cmd in sys.argv[1:]:
        print(f"\n=== {cmd} ===\n")
        print(run(c, cmd))
    c.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: ssh_deploy_run.py CMD [CMD ...]", file=sys.stderr)
        sys.exit(1)
    main()
