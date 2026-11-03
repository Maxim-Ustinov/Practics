# Публикация лендинга TenderScope на VPS

Документ описывает, как опубликовать статический лендинг из папки `landing/` на VPS `62.109.2.91`.
**Деплой в рамках подготовки лендинга не выполнялся.** Все команды ниже — инструкция для отдельного релизного шага.

## 1. Исходные данные

| Параметр | Значение |
|---|---|
| VPS | `62.109.2.91` |
| Основной домен | `tenderscope.ru` |
| API-поддомен | `api.tenderscope.ru` |
| DNS | A-записи `tenderscope.ru`, `www.tenderscope.ru`, `api.tenderscope.ru` указывают на `62.109.2.91` |
| Сайт | статика из `landing/` |
| Бэкенд | ASP.NET Core, предположительно локальный порт `5033` (уточнить в конфиге) |
| Текущее состояние | `http://62.109.2.91` отдаёт заглушку ISPmanager, HTTPS не работает |

### Почему сейчас отдаётся заглушка

Наиболее вероятные причины (проверять по порядку):

1. В ISPmanager не создан WWW-домен `tenderscope.ru` (или создан, но docroot пустой/не тот). Тогда nginx/apache панели отдаёт дефолтную страницу-заглушку.
2. Порты 80/443 заняты веб-стеком ISPmanager (nginx + apache/php-fpm). Если поднимать Caddy или отдельный nginx, они не смогут занять порты.
3. Для домена не выпущен SSL-сертификат, поэтому HTTPS-соединение не устанавливается.
4. DNS ещё не обновился на стороне клиента/резолвера (маловероятно, если A-записи уже указывают на сервер).
5. Firewall/security group провайдера закрывает 80/443.

### Проверка DNS и текущего ответа (с локальной машины)

```powershell
nslookup tenderscope.ru
nslookup api.tenderscope.ru
curl.exe -I http://62.109.2.91
curl.exe -I -H "Host: tenderscope.ru" http://62.109.2.91
curl.exe -Ik https://tenderscope.ru
```

Ожидаемо:

- `nslookup` возвращает `62.109.2.91`;
- `curl -I -H "Host: tenderscope.ru"` показывает заглушку или 404, а не лендинг;
- `curl -Ik https://tenderscope.ru` падает с ошибкой TLS/connection — сертификата нет.

### Проверка на сервере

```bash
ssh root@62.109.2.91

# кто слушает 80/443
ss -tlnp | grep -E ':80|:443'

# какие веб-серверы запущены
systemctl status nginx --no-pager
systemctl status apache2 --no-pager
systemctl status ispmgr --no-pager

# версии и конфиги
nginx -v
nginx -t
```

Если порты заняты ISPmanager, есть два пути:

- **Вариант A (рекомендуется для статики):** освободить 80/443, отключить веб-стек панели и поставить Caddy с автоматическим HTTPS.
- **Вариант B:** остаться на nginx ISPmanager, создать сайт в панели, выпустить сертификат средствами панели и добавить proxy для `api.tenderscope.ru`.

Не запускайте оба веб-сервера одновременно на одних портах.

## 2. Вариант A — Caddy (автоматический HTTPS)

Caddy сам получает и продлевает сертификаты Let's Encrypt, если DNS указывает на сервер и порт 80 доступен извне.

### 2.1. Установка (Ubuntu/Debian)

```bash
apt update
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list

apt update
apt install -y caddy
```

### 2.2. Освобождение портов

Сначала убедитесь, что в ISPmanager нет других сайтов, которые нельзя останавливать.

```bash
# посмотреть, кто слушает порты
ss -tlnp | grep -E ':80|:443'

# если это nginx/apache панели и других сайтов нет:
systemctl stop nginx apache2 2>/dev/null
systemctl disable nginx apache2 2>/dev/null

# саму панель можно оставить, если она не держит 80/443
# systemctl status ispmgr --no-pager
```

Если ISPmanager автоматически поднимает веб-сервер обратно, отключите соответствующие сайты в панели или настройте публикацию целиком средствами панели (вариант B).

### 2.3. Каталог сайта

```bash
mkdir -p /var/www/tenderscope/releases/2026-11-03
mkdir -p /var/www/tenderscope

# отдельный пользователь для загрузки (опционально)
useradd -r -s /usr/sbin/nologin -d /var/www/tenderscope deploy 2>/dev/null || true
chown -R deploy:deploy /var/www/tenderscope
```

Caddy запускается от пользователя `caddy` и должен иметь **чтение** файлов. Достаточно прав `644` на файлы и `755` на каталоги:

```bash
find /var/www/tenderscope -type d -exec chmod 755 {} \;
find /var/www/tenderscope -type f -exec chmod 644 {} \;
```

### 2.4. Загрузка файлов

С Windows (PowerShell), из корня репозитория:

```powershell
scp -r .\landing\* root@62.109.2.91:/var/www/tenderscope/releases/2026-11-03/
```

Если есть WSL/Git Bash и rsync:

```bash
rsync -avz --delete landing/ root@62.109.2.91:/var/www/tenderscope/releases/2026-11-03/
```

`--delete` удаляет на сервере файлы, которых нет локально. Используйте только для отдельного release-каталога, не для `/var/www/tenderscope` целиком.

Симлинк «текущего» релиза:

```bash
ln -sfn /var/www/tenderscope/releases/2026-11-03 /var/www/tenderscope/current
```

### 2.5. Caddyfile

Файл `/etc/caddy/Caddyfile`:

```caddyfile
{
	email admin@tenderscope.ru
}

tenderscope.ru {
	root * /var/www/tenderscope/current
	encode zstd gzip

	# Чистые URL: /privacy → /privacy.html
	try_files {path} {path}.html {path}/index.html
	file_server

	header {
		X-Content-Type-Options nosniff
		X-Frame-Options SAMEORIGIN
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "geolocation=(), microphone=(), camera=()"
		-Server
	}

	@static path *.css *.js *.svg *.png *.ico *.txt *.xml
	header @static Cache-Control "public, max-age=604800"

	@html path *.html /
	header @html Cache-Control "no-cache"
}

www.tenderscope.ru {
	redir https://tenderscope.ru{uri} permanent
}

api.tenderscope.ru {
	encode zstd gzip
	reverse_proxy 127.0.0.1:5033
}
```

Пояснения:

- `root` указывает на симлинк `current` — так можно переключать релизы без правки конфига.
- `try_files` позволяет открывать `/privacy` без `.html`.
- `api.tenderscope.ru` проксирует запросы на локальный ASP.NET Core. **Порт `5033` нужно сверить с фактическим портом бэкенда** (в production это может быть `8080`, `5000` или порт из `ASPNETCORE_URLS`).
- Если API ещё не развёрнут на этом сервере, уберите блок `api.tenderscope.ru`, иначе поддомен будет отдавать 502 (сертификат при этом выпустится).
- `email` в глобальном блоке — адрес для уведомлений Let's Encrypt. Замените на рабочий.

Проверка и применение:

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl status caddy --no-pager
journalctl -u caddy -n 80 --no-pager
```

При первом запросе к `https://tenderscope.ru` Caddy выпустит сертификат. Логи должны содержать `certificate obtained successfully`.

### 2.6. Проверка

```bash
curl -I https://tenderscope.ru
curl -I https://www.tenderscope.ru
curl -I https://tenderscope.ru/privacy.html
curl -I https://tenderscope.ru/assets/og-image.png
curl -I https://api.tenderscope.ru
```

Ожидаемо:

- `https://tenderscope.ru` — `200`, заголовок `content-type: text/html`;
- `www` — `301` на основной домен;
- `privacy.html` — `200`;
- `api` — `200/401/404` от бэкенда, но не `502`, если API запущен.

## 3. Вариант B — Nginx + Certbot

Если решено остаться на nginx (в том числе nginx ISPmanager), конфиг виртуального хоста:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tenderscope.ru www.tenderscope.ru;

    root /var/www/tenderscope/current;
    index index.html;

    # редирект www → без www
    if ($host = www.tenderscope.ru) {
        return 301 https://tenderscope.ru$request_uri;
    }

    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    location ~* \.(css|js|svg|png|ico|txt|xml)$ {
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    gzip on;
    gzip_types text/plain text/css application/javascript image/svg+xml application/xml;
}
```

Для API — отдельный server-блок:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.tenderscope.ru;

    location / {
        proxy_pass http://127.0.0.1:5033;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Проверка и выпуск сертификатов:

```bash
nginx -t
systemctl reload nginx

apt install -y certbot python3-certbot-nginx
certbot --nginx \
  -d tenderscope.ru \
  -d www.tenderscope.ru \
  -d api.tenderscope.ru \
  --redirect \
  --agree-tos \
  -m admin@tenderscope.ru
```

Проверка автопродления:

```bash
certbot renew --dry-run
systemctl list-timers | grep certbot
```

Если ISPmanager управляет конфигами nginx, правки вручную могут быть перезаписаны панелью. В этом случае создайте сайт и SSL через интерфейс ISPmanager, а proxy для API добавьте в настройках сайта/панели.

## 4. ISPmanager: что исправить сейчас

1. Войти в панель ISPmanager (обычно `https://62.109.2.91:1500` или другой порт из письма провайдера).
2. Проверить раздел «WWW-домены» / «Сайты»:
   - есть ли `tenderscope.ru`;
   - какой docroot указан;
   - не стоит ли заглушка/парковка.
3. Если сайта нет — создать сайт с docroot `/var/www/tenderscope/current`, без PHP (статика).
4. Выпустить Let's Encrypt-сертификат для `tenderscope.ru` и `www.tenderscope.ru` средствами панели.
5. Для `api.tenderscope.ru` создать отдельный сайт/прокси на `127.0.0.1:5033` (или временно не публиковать API).
6. Убедиться, что панель не отдаёт свою заглушку: `curl -I -H "Host: tenderscope.ru" http://62.109.2.91` должен вернуть `200` и HTML лендинга.
7. Если используется Caddy — отключить веб-сервер панели, который занимает 80/443, иначе Caddy не запустится.

**Не удаляйте сайты и базы других проектов в панели.** Сначала снимите список доменов и проверьте, что на сервере нет чужих сайтов.

## 5. Firewall

```bash
ufw status
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Не открывайте наружу PostgreSQL (`5432`), Hangfire dashboard и debug-эндпоинты.

## 6. Релизный процесс и откат

Рекомендуемая схема:

```text
/var/www/tenderscope/
├── releases/
│   ├── 2026-11-03/
│   └── 2026-11-15/
└── current -> releases/2026-11-15
```

Обновление:

```bash
# 1. загрузить новый релиз в releases/<date>
# 2. проверить права
find /var/www/tenderscope/releases/<date> -type d -exec chmod 755 {} \;
find /var/www/tenderscope/releases/<date> -type f -exec chmod 644 {} \;
# 3. переключить симлинк атомарно
ln -sfn /var/www/tenderscope/releases/<date> /var/www/tenderscope/current.new
mv -Tf /var/www/tenderscope/current.new /var/www/tenderscope/current
# 4. проверить
curl -I https://tenderscope.ru
```

Откат — переключить `current` на предыдущий релиз той же командой `ln -sfn`.

## 7. Что проверить после публикации

- [ ] `https://tenderscope.ru/` открывается, сертификат валиден.
- [ ] `http://tenderscope.ru/` редиректит на HTTPS.
- [ ] `https://www.tenderscope.ru/` редиректит на основной домен.
- [ ] `https://tenderscope.ru/privacy.html` и `terms.html` открываются.
- [ ] `https://tenderscope.ru/robots.txt` и `sitemap.xml` отдаются с `200`.
- [ ] `https://tenderscope.ru/assets/og-image.png` отдаётся с `200` и корректным `content-type`.
- [ ] Форма заявки открывает почтовый клиент с письмом на `hello@tenderscope.ru`.
- [ ] Мобильное меню работает на телефоне.
- [ ] Нет горизонтального скролла на 375 px.
- [ ] В консоли браузера нет ошибок.
- [ ] `https://api.tenderscope.ru` отвечает от бэкенда (если API развёрнут).
- [ ] Сертификаты продлеваются: `certbot renew --dry-run` или логи Caddy.

## 8. Ограничения и предупреждения

- **Деплой не выполнен.** Инструкция не запускает команды на сервере.
- Не публикуйте `landing/` через `file://` как «релиз»: нужен веб-сервер с корректными MIME-типами.
- Не оставляйте открытым Hangfire (`/hangfire`) и debug-контроллеры API.
- Не храните секреты (JWT, OpenAI, S3, SMTP) в статике или в git.
- Если DNS будет переведён на Cloudflare, режим SSL должен быть `Full (strict)`, а origin-сертификат — валидным.
- После публикации проверьте страницы в валидаторе Open Graph: кэш соцсетей может держать старую картинку.
