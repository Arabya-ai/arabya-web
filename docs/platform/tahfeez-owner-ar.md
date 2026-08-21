# التسميع الذكي على Contabo (مجاني — بلا مفاتيح)

## ماذا يعمل الآن؟
- مسار `/tahfeez` للمسجّلين — **كل السور 1–114** عبر اختيار السورة ونطاق الآيات
- رابط عميق مثل `/tahfeez?surah=2&from=1&to=20` (حد أقصى 20 آية لكل تحميل)
- بورتفوليو في `/account/tahfeez` مع روابط لإعادة تسميع الجلسات الضعيفة
- التعرف على الصوت في المتصفح (Chrome/Edge) مجانًا بلا مفتاح API

## بعد السحب على Contabo
```bash
cd /var/www/arabya-web
git pull --ff-only origin main
bash scripts/contabo-deploy.sh
```

Node المقبول: **22 أو 24**.  
تأكد أن `ARABYA_USER_SYNC_ENABLED=1` حتى تُحفظ جلسات التسميع في SQLite على السيرفر.
