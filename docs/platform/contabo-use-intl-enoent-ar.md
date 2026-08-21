# إصلاح `ENOENT … use-intl/dist/esm/production/core.js` على Contabo

## العَرَض
أثناء `npm run build` / `contabo-deploy.sh`:
```text
ENOENT: no such file or directory, open
'…/node_modules/use-intl/dist/esm/production/core.js'
```
الموقع قد يظهر **500** لأن البناء فشل بعد مسح `.next`.

## السبب
استخراج npm ناقص لـ `use-intl` (غالبًا مع `TAR_ENTRY_ERROR` أو Node 24 + كاش تالف).

## مطلوب منك الآن (PuTTY كـ root)

```bash
cd /var/www/arabya-web
pm2 stop arabya-web || true
df -h /
rm -rf node_modules .next
npm cache clean --force
rm -rf ~/.npm/_cacache

# تأكد أن الحزمة مكتملة قبل البناء
npm ci --no-audit --no-fund
test -f node_modules/use-intl/dist/esm/production/core.js && echo "use-intl OK" || npm install use-intl@4.13.4 next-intl@4.13.4 --no-save

export NODE_OPTIONS=--max-old-space-size=4096
NEXT_TELEMETRY_DISABLED=1 npm run build
pm2 restart arabya-web --update-env

# تحقق (لاحظ: بدون ~ في نهاية الأمر)
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000/lughawi | head -10
```

موصى به لاحقًا: الرجوع إلى **Node 22** (أثبت على Contabo):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v
```
