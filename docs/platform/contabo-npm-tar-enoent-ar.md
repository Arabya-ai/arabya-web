# Contabo: أخطاء npm (tar ENOENT وملفات ناقصة مثل use-intl)

## ماذا يحدث؟

أثناء `npm ci` على السيرفر تظهر أحياناً رسائل مثل:

```text
npm warn tar TAR_ENTRY_ERROR ENOENT: no such file or directory, open '.../node_modules/...'
```

أحياناً ينجح الأمر ظاهرياً ثم يفشل البناء بـ:

```text
Error: ENOENT: no such file or directory, open '.../node_modules/use-intl/dist/esm/production/core.js'
```

المعنى: أثناء فك أرشيف الحزم، ملف أو مجلد كان يفترض أن يُكتب **اختفى** أو لم يُستخرج بالكامل. النتيجة الشائعة: `node_modules` تالف جزئياً → البناء يفشل.

## لماذا يحدث على Contabo؟

غالباً مزيج من:

1. **تشغيل `arabya-web` أثناء المسح** — `next` يفتح ملفات كثيرة داخل `node_modules`؛ مسح المجلد أثناء التشغيل يسبب تعارضات.
2. **مسح غير مكتمل** — `rm -rf node_modules` ثم تثبيت فوري بينما ما زالت ملفات تُحذف.
3. **كاش npm تالف** (`~/.npm/_cacache`) — أرشيفات ناقصة تُعاد استخدامها.
4. **سباق مع عمليات أخرى** على القرص (نادر مع مساحة كافية).

القرص عندك كبير؛ المشكلة ليست امتلاء الـ disk عادةً.

## ماذا يفعل سكربت النشر الآن؟

`scripts/contabo-deploy.sh`:

1. يوقف `arabya-web` في PM2 **قبل** مسح `node_modules`.
2. ينظّف كاش npm.
3. يمسح `node_modules` و`package-lock` المؤقت إن لزم، وينتظر قليلاً.
4. يشغّل `npm ci` مع إعادة محاولة بعد فشل/تحذيرات tar.
5. **يتحقق** من ملفات حرجة (`use-intl/.../core.js`, `next-intl`, `next`, `react`, `sharp`, …).
6. إن نقص شيء: يحذف الحزم التالفة ويعيد `npm ci` مرة أخيرة؛ إن بقي النقص → يتوقف **بدون** إعادة تشغيل الموقع بنسخة مكسورة.

## إصلاح يدوي سريع (use-intl ناقص الآن)

على السيرفر، **لا** تعتمد على `pm2 restart` بعد فشل البناء — أعد البناء بعد إصلاح الحزم:

```bash
cd /var/www/arabya-web
pm2 stop arabya-web

rm -rf node_modules/use-intl node_modules/next-intl
npm install next-intl@4.13.4 --no-save --include=optional
# أو تثبيت كامل أنظف:
# rm -rf node_modules
# npm cache clean --force
# npm ci --include=optional

test -f node_modules/use-intl/dist/esm/production/core.js && echo OK

NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build
pm2 restart arabya-web --update-env
curl -sI -H 'Host: www.arabya.org' http://127.0.0.1:3000/ | head -5
```

بعد دمج إصلاح سكربت التحقق في `main`، يكفي عادةً:

```bash
cd /var/www/arabya-web
git pull --ff-only origin main
bash scripts/contabo-deploy.sh
```

## إن استمر الفشل

```bash
npm cache clean --force
rm -rf ~/.npm/_cacache
rm -rf /var/www/arabya-web/node_modules
# ثم أعد السكربت أو npm ci يدوياً كما أعلاه
```

تأكد أن لا عملية أخرى تلمس `/var/www/arabya-web` أثناء التثبيت (`lsof +D node_modules` إن لزم).
