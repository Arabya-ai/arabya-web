# إزالة مسار الفيديو الذكي (MoneyPrinterTurbo)

تاريخ: 21 أغسطس 2026

## القرار
مسار `/studio/ai` ومحرك `services/money-printer-turbo` (PM2: `arabya-mpt-api`) أُزيلا من المنتج.

الأسباب:
- يعتمد على محرك Python ثقيل + مفاتيح LLM + ffmpeg ولا يعمل بكفاءة على Contabo.
- كان متوقفاً افتراضياً؛ عند تشغيله يستهلك CPU/RAM ويثقل الموقع الأساسي.
- استوديو الآيات `/studio` ومسار `/create` يغطيان إنشاء وسائط التلاوة في المتصفح (Mediabunny).

## ما بقي
- `/studio` ومحرر الآيات وتصدير المتصفح
- `/create` صورة/فيديو خفيف
- واجهات Pexels/Pixabay الخاصة بالاستوديو

## Contabo بعد الدمج
```bash
cd /var/www/arabya-web
git pull --ff-only origin main
bash scripts/contabo-deploy.sh
pm2 delete arabya-mpt-api 2>/dev/null || true
pm2 save
```
