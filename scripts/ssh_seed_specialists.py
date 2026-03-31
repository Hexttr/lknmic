"""На сервере: npm run db:seed:specialists. Нужны SSH_PASS и задеплоенный код с prisma/seed-specialists.ts."""
import os
import sys

import paramiko

HOST = os.environ.get("LK_SSH_HOST", "5.129.249.151")
USER = os.environ.get("LK_SSH_USER", "root")
APP = os.environ.get("LK_APP_DIR", "/var/www/lk.nmiczd.ru")


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    pw = os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS", file=sys.stderr)
        sys.exit(1)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=pw, timeout=60)
    cmd = f"cd {APP} && npm run db:seed:specialists"
    print(cmd, flush=True)
    _, out, err = c.exec_command(cmd, timeout=300)
    print(out.read().decode("utf-8", errors="replace"))
    e = err.read().decode("utf-8", errors="replace")
    if e:
        print(e, file=sys.stderr)
    code = out.channel.recv_exit_status()
    c.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
