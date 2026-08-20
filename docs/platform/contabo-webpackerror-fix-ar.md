# إصلاح فشل البناء على Contabo: `WebpackError is not a constructor`

## العَرَض
أثناء `npm run build` على السيرفر يظهر:
```text
TypeError: __webpack.WebpackError is not a constructor
> Build failed because of webpack errors
```

## السبب
يحدث مع Next 15.5.x عند:
- تشغيل **Node 24** بدل **Node 22**، أو
- `node_modules` ناقص/تالف بعد تثبيت متقطع

## الإصلاح في الكود (بعد دمج هذا الطلب)
- `experimental.serverMinification: false` في `next.config.ts`
- `engines.node = 22.x`
- فحص Node + سلامة webpack داخل `scripts/contabo-deploy.sh`

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
