"""
Деплой на сервер через paramiko: архив проекта → /var/www/lk.nmiczd.ru,
npm ci + build, PM2, nginx, certbot.
Секреты: SSH_PASSWORD, опционально SMS_RU_API_ID (или подтянется из ../.env локально).
"""

from __future__ import annotations

import io
import os
import sys

# Windows-консоль: не падаем на символах вроде ✔ из npm
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
    )
if hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True
    )
import tarfile
import tempfile
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
DEPLOY = Path(__file__).resolve().parent
REMOTE_DIR = "/var/www/lk.nmiczd.ru"
REMOTE_TAR = "/tmp/nczd-lk-deploy.tgz"
PORT = 3010

EXCLUDE_DIRS = {
    "node_modules",
    ".next",
    ".git",
    "deploy",
}
EXCLUDE_FILES = {".env", "dev.db"}


def should_add(path: Path, rel: str) -> bool:
    parts = Path(rel).parts
    if any(p in EXCLUDE_DIRS for p in parts):
        return False
    if rel in EXCLUDE_FILES or Path(rel).name in EXCLUDE_FILES:
        return False
    return True


def make_tarball() -> Path:
    tmp = tempfile.NamedTemporaryFile(suffix=".tgz", delete=False)
    tmp.close()
    out = Path(tmp.name)
    with tarfile.open(out, "w:gz") as tf:
        for path in ROOT.rglob("*"):
            if not path.is_file():
                continue
            try:
                rel = path.relative_to(ROOT)
            except ValueError:
                continue
            if not should_add(path, str(rel)):
                continue
            tf.add(path, arcname=str(rel).replace("\\", "/"))
    return out


def read_local_sms_id() -> str:
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return os.environ.get("SMS_RU_API_ID", "")
    for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line.startswith("SMS_RU_API_ID="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("SMS_RU_API_ID", "")


def ssh_connect() -> paramiko.SSHClient:
    host = os.environ.get("SSH_HOST", "5.129.249.151")
    user = os.environ.get("SSH_USER", "root")
    password = os.environ.get("SSH_PASSWORD")
    if not password:
        print("Set SSH_PASSWORD", file=sys.stderr)
        sys.exit(1)
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        hostname=host,
        username=user,
        password=password,
        timeout=60,
        allow_agent=False,
        look_for_keys=False,
    )
    return c


def run(
    client: paramiko.SSHClient, cmd: str, timeout: int = 600
) -> tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return code, out, err


def sftp_put(client: paramiko.SSHClient, local: Path, remote: str) -> None:
    sftp = client.open_sftp()
    try:
        sftp.put(str(local), remote)
    finally:
        sftp.close()


def main() -> None:
    sms_id = read_local_sms_id()
    if not sms_id:
        print(
            "Предупреждение: SMS_RU_API_ID не найден. Задайте в ../.env или export SMS_RU_API_ID=...",
            file=sys.stderr,
        )

    tarball = make_tarball()
    print(f"Архив: {tarball} ({tarball.stat().st_size} bytes)")

    client = ssh_connect()
    try:
        # Проверка DNS
        code, out, err = run(
            client,
            "getent hosts lk.nmiczd.ru || true; dig +short lk.nmiczd.ru A 2>/dev/null || true",
        )
        print("DNS lk.nmiczd.ru:\n", out, err)

        # Каталог приложения
        run(client, f"mkdir -p {REMOTE_DIR}/data")
        sftp_put(client, tarball, REMOTE_TAR)

        # Распаковка
        run(
            client,
            f"tar -xzf {REMOTE_TAR} -C {REMOTE_DIR} && rm -f {REMOTE_TAR}",
            timeout=120,
        )

        # SESSION_SECRET на сервере
        code, session_secret, _ = run(
            client, "openssl rand -hex 32", timeout=10
        )
        if code != 0 or not session_secret.strip():
            session_secret = "fallback-" + "x" * 40
        session_secret = session_secret.strip()

        # .env на сервере (без вывода секрета в лог)
        env_lines = [
            f'DATABASE_URL="file:./data/prod.db"',
            f'SESSION_SECRET="{session_secret}"',
            f'SMS_RU_API_ID="{sms_id}"',
            'SMSRU_WEBHOOK_SECRET=""',
        ]
        env_content = "\n".join(env_lines) + "\n"
        sftp = client.open_sftp()
        try:
            with sftp.file(f"{REMOTE_DIR}/.env", "w") as f:
                f.write(env_content)
        finally:
            sftp.close()

        # Установка и сборка
        install = f"""
set -e
cd {REMOTE_DIR}
# Не задавать NODE_ENV=production до npm ci — иначе не ставятся devDependencies (Tailwind/PostCSS).
npm ci
npx prisma migrate deploy
npm run build
"""
        code, out, err = run(client, install, timeout=900)
        print(out)
        if err:
            print(err, file=sys.stderr)
        if code != 0:
            print("npm/prisma/build failed", file=sys.stderr)
            sys.exit(code)

        # PM2
        run(client, "pm2 delete lk-nmiczd 2>/dev/null || true")
        code, out, err = run(
            client,
            f"cd {REMOTE_DIR} && pm2 start ecosystem.config.cjs && pm2 save",
            timeout=60,
        )
        print(out, err)
        if code != 0:
            sys.exit(code)

        # Nginx: только новый файл
        sftp = client.open_sftp()
        try:
            with open(DEPLOY / "nginx-lk.nmiczd.ru.conf", "rb") as lf:
                with sftp.file("/tmp/nginx-lk.nmiczd.ru.conf", "w") as rf:
                    rf.write(lf.read().decode("utf-8"))
        finally:
            sftp.close()

        run(
            client,
            "cp /tmp/nginx-lk.nmiczd.ru.conf /etc/nginx/sites-available/lk.nmiczd.ru "
            "&& ln -sf /etc/nginx/sites-available/lk.nmiczd.ru /etc/nginx/sites-enabled/lk.nmiczd.ru "
            "&& nginx -t && systemctl reload nginx",
            timeout=60,
        )

        # HTTPS
        cert_cmd = (
            "certbot --nginx -d lk.nmiczd.ru --non-interactive --agree-tos "
            "--register-unsafely-without-email --redirect"
        )
        code, out, err = run(client, cert_cmd, timeout=120)
        print(out, err)
        if code != 0:
            print(
                "Certbot завершился с ошибкой (часто из-за DNS или порта 80). "
                "HTTP уже должен работать: http://lk.nmiczd.ru",
                file=sys.stderr,
            )

        code, out, err = run(client, "nginx -t && systemctl reload nginx", timeout=30)
        print(out, err)

    finally:
        client.close()
        tarball.unlink(missing_ok=True)

    print("\nГотово. Проверьте: https://lk.nmiczd.ru (и вход по телефону).")


if __name__ == "__main__":
    main()
