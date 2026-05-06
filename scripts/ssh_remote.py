"""Общее: подключение по SSH, deploy/.env, переменные AVA_* / LK_*."""
import os
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

import paramiko

from deploy_env import load_deploy_env


def connect(
    host: str | None = None,
    username: str | None = None,
    password: str | None = None,
    timeout: int = 120,
) -> paramiko.SSHClient:
    load_deploy_env()
    pw = password or os.environ.get("SSH_PASS")
    if not pw:
        print("Set SSH_PASS or deploy/.env", file=sys.stderr)
        sys.exit(1)
    h = host or os.environ.get("AVA_SSH_HOST", "178.170.165.72")
    u = username or os.environ.get("AVA_SSH_USER", "user_adm")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(h, username=u, password=pw, timeout=timeout)
    return c


def run(
    c: paramiko.SSHClient,
    cmd: str,
    timeout: int = 600,
    get_pty: bool = False,
) -> int:
    print(f"\n>>> {cmd[:220]}{'...' if len(cmd) > 220 else ''}\n", flush=True)
    _, out, err = c.exec_command(cmd, timeout=timeout, get_pty=get_pty)
    o = out.read().decode("utf-8", errors="replace")
    e = err.read().decode("utf-8", errors="replace")
    if o:
        print(o, end="", flush=True)
    if e:
        print(e, end="", file=sys.stderr, flush=True)
    return out.channel.recv_exit_status()


def sudo_run(c: paramiko.SSHClient, password: str, bash_cmd: str, timeout: int = 900) -> int:
    """Одна команда под root: пароль в stdin для sudo -S."""
    import shlex

    inner = shlex.quote(bash_cmd)
    remote = f"sudo -S -p '' bash -lc {inner}"
    print(f"\n>>> sudo bash -lc ...\n", flush=True)
    stdin, stdout, stderr = c.exec_command(remote, timeout=timeout)
    stdin.write(password + "\n")
    stdin.flush()
    stdin.channel.shutdown_write()
    o = stdout.read().decode("utf-8", errors="replace")
    e = stderr.read().decode("utf-8", errors="replace")
    if o:
        print(o, end="", flush=True)
    if e:
        print(e, end="", file=sys.stderr, flush=True)
    return stdout.channel.recv_exit_status()
