"""Загрузка deploy/.env: SSH_PASS и др. Уже заданные переменные окружения не перезаписываются."""
import os
from pathlib import Path


def load_deploy_env() -> None:
    root = Path(__file__).resolve().parent.parent
    path = root / "deploy" / ".env"
    if not path.is_file():
        return
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        if not key or key in os.environ:
            continue
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        os.environ[key] = val
