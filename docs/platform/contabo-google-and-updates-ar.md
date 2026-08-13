# Contabo — Google OAuth + تحديث الموقع

دليل للمالك بعد نجاح النشر على `www.arabya.org`.

---

## 1) تسجيل الدخول بـ Google

### أ) Google Cloud (مرة واحدة)

1. افتح: https://console.cloud.google.com/
2. اختر مشروع **Arabya** (أو أنشئ مشروعاً جديداً).
3. **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - أكمل الاسم والبريد ثم **Save**.
4. **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Arabya Production`
5. **Authorized JavaScript origins** — أضف:
   ```
   https://www.arabya.org
   https://arabya.org
   http://localhost:3000
   ```
6. **Authorized redirect URIs** — أضف:
   ```
   https://www.arabya.org/api/auth/callback/google
   https://arabya.org/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
7. **Create** — انسخ:
   - **Client ID** (ينتهي بـ `.apps.googleusercontent.com`)
   - **Client Secret**

> لا ترسل السرّ في الدردشة العامة. الصقه مباشرة في السيرفر فقط.

### ب) على السيرفر (SSH)

```bash
cd /var/www/arabya-web
nano .env.production.local
```

تأكد أن الملف يحتوي (عدّل القيم):

```
AUTH_SECRET=... (موجود مسبقاً)
AUTH_GOOGLE_ID=xxxx.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-...
AUTH_URL=https://www.arabya.org
AUTH_TRUST_HOST=true
ARABYA_ADMIN_EMAILS=بريدك@gmail.com
NODE_ENV=production
PORT=3000
```

احفظ: `Ctrl+O` → Enter → `Ctrl+X`

```bash
cp -f .env.production.local .env.local
pm2 restart arabya-web
pm2 status
```

### ج) اختبار

1. **امسح كookies** لـ `arabya.org` من المتصفح (أو نافذة خاصة).
2. افتح دائماً: **https://www.arabya.org** (وليس `arabya.org` بدون www).
3. اضغط **دخول** → اختر Gmail.
4. يجب أن تفتح **حسابي** بدون «too many redirects».

### د) إن ظهر ERR_TOO_MANY_REDIRECTS

```bash
cd /var/www/arabya-web
git pull origin main
bash scripts/contabo-deploy.sh
```

ثم أعد الاختبار من **https://www.arabya.org/login** في نافذة خاصة.

إن استمر الخطأ: في Cloudflare → SSL/TLS → **Full** (وليس Flexible).

---

## 2) تحديث الموقع بعد أي تغيير في GitHub

### الطريقة السريعة (أمر واحد)

```bash
cd /var/www/arabya-web
bash scripts/contabo-deploy.sh
```

### يدوياً (نفس الخطوات)

```bash
cd /var/www/arabya-web
git pull origin main
npm ci
npm run build
pm2 restart arabya-web
pm2 save
curl -I http://127.0.0.1:3000
```

### بعد التحديث

افتح https://www.arabya.org/mushaf/1 وتأكد أن الصفحة تعمل.

---

## 3) مزامنة المفضّلة والملاحظات (SQLite على السيرفر)

بدلاً من D1/Cloudflare — البيانات تُحفظ في ملف SQLite على Contabo (قرص 200GB).

### أ) تفعيل المزامنة (مرة واحدة على SSH)

```bash
sudo mkdir -p /var/lib/arabya
sudo chown "$(whoami):$(whoami)" /var/lib/arabya

cd /var/www/arabya-web
nano .env.production.local
```

أضف أو عدّل:

```
ARABYA_USER_SYNC_ENABLED=1
ARABYA_USER_DB_PATH=/var/lib/arabya/user-data.sqlite
```

احفظ ثم:

```bash
cp -f .env.production.local .env.local
bash scripts/contabo-deploy.sh
```

(السكربت ينشئ ملف SQLite تلقائياً إن لم يكن موجوداً.)

### ب) اختبار من جهازين

1. سجّل دخول Gmail على **https://www.arabya.org**
2. من المصحف: احفظ آية في **المفضّلة** أو اكتب **ملاحظة**
3. من **حسابي** → اضغط **مزامنة** (أو انتظر المزامنة التلقائية)
4. من جهاز أو متصفح آخر (نفس الحساب): **مزامنة** ثم افتح **/favorites** — يجب أن تظهر البيانات

### ج) نسخ احتياطي (اختياري)

```bash
cp /var/lib/arabya/user-data.sqlite /var/lib/arabya/backup-$(date +%F).sqlite
```

---

## Proxy LiteSpeed (مرجع — لا تغيّر إن كان الموقع يعمل)

ملف `.htaccess` الصحيح:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://arabya-node/$1 [P,L]
```

وفي `/etc/serveravatar-ols/arabyaorg.conf` يجب وجود `extprocessor arabya-node` على `127.0.0.1:3000`.

---

## أوامر مفيدة

| الأمر | الغرض |
|--------|--------|
| `pm2 status` | هل التطبيق يعمل؟ |
| `pm2 logs arabya-web --lines 50` | آخر الأخطاء |
| `pm2 restart arabya-web` | بعد تعديل `.env` |
| `/usr/local/lsws/bin/lswsctrl restart` | بعد تغيير Proxy |
