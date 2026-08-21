# Contabo: 503 + `tar TAR_ENTRY_ERROR` على `next/dist`

## ماذا تعني سجلاتك؟
```text
npm warn tar TAR_ENTRY_ERROR ENOENT: …/node_modules/next/dist
==> use-intl/next-intl incomplete after npm ci — reinstalling
```
يعني `npm ci` أنهى بـ exit 0 لكن استخراج حزمة `next` (وأحياناً غيرها) **ناقص**. بعدها يبقى `arabya-web` متوقفاً → الموقع 503.

تحذير `@sentry/cli` / `allow-scripts` **ليس** سبب التوقف؛ يمكن تجاهله الآن.

## مطلوب منك الآن (بالترتيب)

### أ) أعد الموقع فوراً (قبل أي نشر)
```bash
cd /var/www/arabya-web
pm2 stop arabya-nlp 2>/dev/null || true
if [ -d .next.prev-good ]; then
  rm -rf .next
  mv .next.prev-good .next
fi
pm2 restart arabya-web --update-env
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000 | head -5
```

### ب) بعد دمج PR الإصلاح — نشر نظيف
```bash
cd /var/www/arabya-web
pm2 stop arabya-web arabya-nlp 2>/dev/null || true
df -h /
git fetch origin main && git checkout main && git pull --ff-only origin main
rm -rf node_modules ~/.npm/_cacache
npm cache clean --force
bash scripts/contabo-deploy.sh
pm2 status
```

**لا تحذف `package-lock.json`.**

### ج) إن بقيت أخطاء tar
```bash
df -h /
du -sh /var/www/arabya-web /root/.npm /tmp 2>/dev/null
# إن كان القرص ممتلئاً: نظّف سجلات PM2 القديمة ثم أعد الخطوة ب
pm2 flush || true
```
