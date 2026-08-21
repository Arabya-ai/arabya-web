# إصلاح `npm warn tar TAR_ENTRY_ERROR ENOENT` على Contabo

## ماذا تعني؟
أثناء `npm ci` يظهر:
```text
npm warn tar TAR_ENTRY_ERROR ENOENT: no such file or directory …
```
يعني استخراج الحزم فشل جزئيًا (كاش تالف، أو `node_modules` يُمسَح أثناء تشغيل التطبيق، أو مساحة قرص منخفضة).

تحذيرات npm القديمة عن `mp4-muxer` / `webm-muxer` لم تعد تنطبق — المشروع يستخدم `mediabunny` للتصدير.

## مطلوب منك الآن على السيرفر

انسخ الأوامر كما هي:

```bash
cd /var/www/arabya-web
pm2 stop arabya-web || true
df -h /
rm -rf node_modules .next
npm cache clean --force
rm -rf ~/.npm/_cacache
git pull --ff-only origin main
bash scripts/contabo-deploy.sh
```

إن بقيت أخطاء tar بعد ذلك:
```bash
df -h /
# إن كانت المساحة ممتلئة: نظّف سجلات قديمة أو ملفات كبيرة ثم أعد المحاولة
du -sh /var/www/arabya-web /root/.npm /tmp 2>/dev/null
```
