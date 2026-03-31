# Деплой lk.nmiczd.ru (production)

## Где живёт приложение

- **Сервер:** `LK_SSH_HOST` (по умолчанию `5.129.249.151`), пользователь `root` или `LK_SSH_USER`.
- **Каталог на сервере:** `LK_APP_DIR` (по умолчанию `/var/www/lk.nmiczd.ru`).
- **Процесс PM2:** только `lk-nmiczd` (порт **3010**, `npm run start:prod`). Другие приложения (например `kid-doctor`) **не трогаем**.
- **БД:** SQLite `DATABASE_URL=file:./data/prod.db` — каталог `data/` при деплое **не перезаписывается** (исключение в `rsync`).

В каталоге на сервере **нет `.git`**: обновление — клон свежего `main` с GitHub во временную папку и `rsync` поверх продакшена.

## Пароль и доступ

- Пароль root **никогда не хранится** в репозитории.
- Локально: переменная **`SSH_PASS`** или файл **`deploy/.env`** в корне репозитория (строка `SSH_PASS=...`; файл в `.gitignore`, в git не попадает). См. `deploy/.env.example`.
- Предпочтительно: **SSH-ключ** вместо пароля.

## Автоматический деплой с машины разработчика

Требуется Python 3 и `pip install paramiko`.

```powershell
cd путь\к\nczd-lk
$env:SSH_PASS='секрет'
python scripts/ssh_deploy_lk.py
```

Скрипт:

1. `git clone --depth 1` репозитория в `/tmp/lknmic-deploy-src`
2. `rsync` в `LK_APP_DIR` с исключениями: `.env`, `data/`, `dev.db`, `node_modules`, `.next`, `.git`
3. `npm ci` → `npx prisma migrate deploy` → `npm run build`
4. `pm2 restart lk-nmiczd --update-env`

Переменные окружения (опционально): `LK_SSH_HOST`, `LK_SSH_USER`, `LK_APP_DIR`.

## Справочник специалистов на проде

Данные списка — в `prisma/specialist-seed-data.ts`; синхронизация — `prisma/sync-specialists.ts` (добавляет новые типы, для совпадающих имён обновляет **iconKey** и **sortOrder**).

После деплоя с актуальным кодом:

```bash
cd /var/www/lk.nmiczd.ru && npm run db:seed:specialists
```

Полный сид с админом: `npm run db:seed` (осторожно на проде — upsert админа по телефону из `prisma/seed.ts`).

## Ручной деплой на сервере (если нужно)

```bash
cd /var/www/lk.nmiczd.ru
# сохранить .env и data заранее при нестандартных правках
npm ci
npx prisma migrate deploy
npm run build
pm2 restart lk-nmiczd --update-env
```

## Репозиторий

- Remote: `https://github.com/Hexttr/lknmic.git`, ветка `main`.

## Только сид специалистов (без полного деплоя)

Если код уже на сервере:

```powershell
$env:SSH_PASS='...'
python scripts/ssh_seed_specialists.py
```

Или по SSH вручную: `cd /var/www/lk.nmiczd.ru && npm run db:seed:specialists`

## Anthropic API с сервера в РФ

Запросы к `api.anthropic.com` идут с **IP сервера**. Если в ЛК ошибка **403** при рабочем ключе, часто это ограничение по региону для IP хостинга (например РФ).

В `.env` на сервере (`/var/www/lk.nmiczd.ru/.env`) можно задать исходящий HTTPS-прокси **только для вызовов Anthropic**:

```env
ANTHROPIC_HTTPS_PROXY=http://user:pass@host:port
```

Подойдёт HTTP CONNECT-прокси или SOCKS5 в поддерживаемой стране (малый VPS в ЕС, коммерческий прокси и т.п.). После изменения: `pm2 restart lk-nmiczd --update-env`.

## Полезно

- Разовые команды по SSH: `python scripts/ssh_deploy_run.py "команда"` (тоже использует `SSH_PASS`).
