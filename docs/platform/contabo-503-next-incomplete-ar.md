# Contabo: موقع 503 أثناء النشر / next ناقص

## الأعراض
- `arabya-web` في PM2 = `stopped`
- السجل: `code-frame still missing` أو تحذير `eslint` في `next.config`
- الموقع يعيد 503 من Cloudflare/LiteSpeed

## السبب الشائع
1. ترقية Next 16 أزالت مفتاح `eslint` من الإعداد.
2. `npm ci` على Contabo أحياناً يستخرج `next` ناقصاً.
3. سكربت النشر القديم كان يتوقف **بدون** إعادة تشغيل النسخة السابقة.

## الإصلاح السريع (على السيرفر)
```bash
cd /var/www/arabya-web
# إن وُجدت نسخة بناء سابقة — أعد الموقع فوراً:
if [ -d .next.prev-good ]; then rm -rf .next; mv .next.prev-good .next; fi
pm2 restart arabya-web --update-env
# ثم انشر الإصلاح من main:
git fetch origin main && git pull --ff-only origin main
rm -rf node_modules ~/.npm/_cacache
npm cache clean --force
bash scripts/contabo-deploy.sh
# لتوفير موارد أثناء الاستعادة (اختياري):
pm2 stop arabya-nlp arabya-mpt-api 2>/dev/null || true
```

**لا تحذف `package-lock.json`.**
