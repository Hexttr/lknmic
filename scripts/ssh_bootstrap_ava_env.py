"""Создать /var/www/ava.nmiczd.ru/.env с SESSION_SECRET, если файла ещё нет."""
import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parent
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from ssh_remote import connect, run


def main() -> None:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    c = connect()
    cmd = r"""cd /var/www/ava.nmiczd.ru && mkdir -p data/uploads && if [ ! -f .env ]; then
  s=$(openssl rand -hex 32)
  printf '%s\n' 'DATABASE_URL=file:./data/prod.db' 'NODE_ENV=production' "SESSION_SECRET=$s" > .env
  echo created
else
  echo exists
fi"""
    code = run(c, cmd, timeout=30)
    c.close()
    sys.exit(code)


if __name__ == "__main__":
    main()
