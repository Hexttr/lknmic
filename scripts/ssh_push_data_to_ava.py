"""
Залить локальный каталог data/ на сервер ava (SFTP), без удаления чужих файлов на сервере.

Использование из корня репозитория (где есть ./data):

  python scripts/ssh_push_data_to_ava.py

Переменные: AVA_SSH_HOST, AVA_SSH_USER, AVA_APP_DIR, SSH_PASS.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path, PurePosixPath

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from deploy_env import load_deploy_env
from ssh_remote import connect


def _mkdir_p(sftp, remote_dir: str) -> None:
    remote_dir = remote_dir.rstrip("/") or "/"
    if remote_dir == "/":
        return
    parts = remote_dir.split("/")
    cur = ""
    for p in parts:
        if not p:
            continue
        cur = f"{cur}/{p}"
        try:
            sftp.mkdir(cur)
        except OSError:
            pass


def _put_dir(sftp, local: Path, remote_base: str) -> None:
    for p in sorted(local.rglob("*")):
        if p.is_dir():
            rel = p.relative_to(local)
            rdir = f"{remote_base}/{rel.as_posix()}".replace("//", "/")
            _mkdir_p(sftp, rdir)
        elif p.is_file():
            rel = p.relative_to(local)
            rpath = f"{remote_base}/{rel.as_posix()}".replace("//", "/")
            _mkdir_p(sftp, str(PurePosixPath(rpath).parent))
            sftp.put(str(p), rpath)
            print(f"  {rel.as_posix()}", flush=True)


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    load_deploy_env()
    root = _scripts.parent
    data = root / "data"
    if not data.is_dir():
        print(f"No local {data}", file=sys.stderr)
        sys.exit(1)

    APP = os.environ.get("AVA_APP_DIR", "/var/www/ava.nmiczd.ru")
    remote_data = f"{APP}/data"

    c = connect()
    sftp = c.open_sftp()
    _mkdir_p(sftp, remote_data)
    print(f"Upload ./data → {remote_data}:")
    _put_dir(sftp, data, remote_data)
    sftp.close()
    c.close()
    print("Done.")


if __name__ == "__main__":
    main()
