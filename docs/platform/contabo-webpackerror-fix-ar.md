# إصلاح فشل البناء على Contabo: `WebpackError is not a constructor`

## العَرَض
أثناء `npm run build` على السيرفر يظهر:
```text
TypeError: __webpack.WebpackError is not a constructor
> Build failed because of webpack errors
```

## السبب
مع Next 15.5.x يظهر الخطأ غالبًا عندما:
1. يفشل **تصغير** جزء من البناء (ذاكرة منخفضة / Node غير 22)، ثم
2. يحاول Next لف الخطأ بـ `WebpackError` لكن المُنشئ غير مربوط على واجهة webpack المصدَّرة — فيُخفى السبب الحقيقي خلف `is not a constructor`.

## الإصلاح في الكود (بعد دمج هذا الطلب)
- رفع `WebpackError` في `next.config.ts` حتى يظهر الخطأ الحقيقي إن وُجد
- `experimental.serverMinification: false`
- تثبيت `engines.node = 22.x` + فحص في `contabo-deploy.sh`
- `NODE_OPTIONS=--max-old-space-size=4096` أثناء البناء على السيرفر

## مطلوب منك الآن على السيرفر (PuTTY)

```bash
node -v
# يجب أن ترى v22.x — إن رأيت v24 أو غير ذلك:
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v

cd /var/www/arabya-web
git fetch origin main
git checkout main
git pull --ff-only origin main
bash scripts/contabo-deploy.sh
```

بعد النجاح:
```bash
pm2 status
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000 | head -5
```

لا تستخدم `npm run build` وحدها على شجرة قديمة — استخدم دائمًا `bash scripts/contabo-deploy.sh`.
