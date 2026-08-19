# دليل المالك — مولّد الفيديو الذكي بجانب عربية ستوديو

هذا مسار **مستقل** عن محرّر آيات `/studio`. لا يغيّر المصحف ولا تصدير التلاوة.

- الواجهة: https://www.arabya.org/studio/ai  
- المحرك: مشروع MoneyPrinterTurbo (MIT) داخل `services/money-printer-turbo`

## الفرق السريع

| | استوديو الآيات `/studio` | الفيديو الذكي `/studio/ai` |
|--|--|--|
| المصدر | آيات المصحف + قرّاء | موضوع أو سكربت بالذكاء |
| أين يُركَّب الفيديو | المتصفح (WebCodecs) | سيرفر Python + ffmpeg |
| متى يعمل | دائمًا مع الموقع | بعد تشغيل المحرك ومفاتيح LLM + Pexels |

## تشغيل المحرك على نفس سيرفر Contabo

1. ثبّت Docker أو Python 3.11 و ffmpeg.
2. من مجلد الموقع:
   - `docker compose -f docker-compose.mpt.yml up --build -d`
   - أو داخل `services/money-printer-turbo`: انسخ `config.example.toml` إلى `config.toml` ثم `python main.py`.
3. أضف في `.env.production.local`:
   - `MONEYPRINTER_API_URL=http://127.0.0.1:8080`
   - `PEXELS_API_KEY=...` (نفس مفتاح خلفيات الاستوديو يكفي)
4. أعد تشغيل عربية (`pm2 restart arabya-web` أو سكربت التحديث).
5. افتح `/studio/ai` (الهبوط عام). إنشاء الفيديو والمهام تتطلب تسجيل Google.

لا تفتح منفذ 8080 على الإنترنت. الواجهة تمر عبر `/api/studio/ai` بعد تسجيل الدخول فقط.

لا تستخدم مجلد `storage/local_videos` للتوليد — المشاهد تُجلب عبر واجهة Pexels.

## مفاتيح مطلوبة لمسار «موضوع → فيديو»

- مفتاح نموذج لغوي (Dahl / OpenAI-compatible) لتوليد السكربت وكلمات البحث
- مفتاح **Pexels** (أو Pixabay) لجلب المشاهد عبر API — يُقرأ من `PEXELS_API_KEY` في ملف البيئة أو يُنسخ إلى `config.toml` عند النشر. لا يُرسل من المتصفح.

Edge TTS للأصوات العربية لا يحتاج مفتاحًا.

## مطلوب منك الآن

سجّل الدخول بـ Google ثم افتح:
https://www.arabya.org/studio/ai/create

اكتب موضوعًا واضغط «بدء التوليد». السكربت والمشاهد يُولَّدان عبر الواجهات البرمجية.

بدون حساب ستُحوَّل إلى صفحة تسجيل الدخول (وليس 404).

التبديل التلقائي عند نفاد الرصيد: المفتاح الجديد أولًا، ثم المفتاح السابق؛ والنماذج بالترتيب MiniMax M2.7 → Kimi K2.6 → DeepSeek V4.

لا تضع المفاتيح في Git. إن أضفت أسرار GitHub Production (`MPT_DAHL_API_KEYS` و`PEXELS_API_KEY`) تُستخدم بدل القيم على السيرفر.
