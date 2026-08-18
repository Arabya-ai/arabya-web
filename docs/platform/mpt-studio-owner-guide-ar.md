# دليل المالك — مولّد الفيديو الذكي بجانب عربية ستوديو

هذا مسار **مستقل** عن محرّر آيات `/studio`. لا يغيّر المصحف ولا تصدير التلاوة.

- الواجهة: https://www.arabya.org/studio/ai  
- المحرك: مشروع MoneyPrinterTurbo (MIT) داخل `services/money-printer-turbo`

## الفرق السريع

| | استوديو الآيات `/studio` | الفيديو الذكي `/studio/ai` |
|--|--|--|
| المصدر | آيات المصحف + قرّاء | موضوع أو سكربت بالذكاء |
| أين يُركَّب الفيديو | المتصفح (WebCodecs) | سيرفر Python + ffmpeg |
| متى يعمل | دائمًا مع الموقع | بعد تشغيل المحرك ومفاتيح LLM/Pexels |

## تشغيل المحرك على نفس سيرفر Contabo

1. ثبّت Docker أو Python 3.11 و ffmpeg.
2. من مجلد الموقع:
   - `docker compose -f docker-compose.mpt.yml up --build -d`
   - أو داخل `services/money-printer-turbo`: انسخ `config.example.toml` إلى `config.toml` ثم `python main.py`.
3. أضف في `.env.production.local`:
   - `MONEYPRINTER_API_URL=http://127.0.0.1:8080`
4. أعد تشغيل عربية (`pm2 restart arabya-web` أو سكربت التحديث).
5. افتح `/studio/ai` بعد تسجيل الدخول. إن ظهر «المحرك غير مشغّل» راجع أن المنفذ 8080 يستجيب: `http://127.0.0.1:8080/docs`.

لا تفتح منفذ 8080 على الإنترنت. الواجهة تمر عبر `/api/studio/ai` بعد تسجيل الدخول فقط.

## مسار يعمل بلا مفاتيح (محلي)

ضع صور PNG أو فيديوهات MP4 في `services/money-printer-turbo/storage/local_videos/`. من `/studio/ai/create` اختر مصدر «ملفات محلية»، الصق سكربتًا عربيًا، وابدأ التوليد. صوت Edge TTS لا يحتاج مفتاحًا.

## مفاتيح مطلوبة داخل `config.toml` لمسار «موضوع → سكربت + مخزون»

- مفتاح نموذج لغوي (OpenAI / Gemini / غيرها حسب اختيارك في ملف الإعداد)
- مفتاح Pexels أو Pixabay لمقاطع المخزون (يمكن إعادة استخدام مفاتيح الاستوديو إن رغبت بنسخها يدويًا إلى config.toml — لا تُرسل من المتصفح)

Edge TTS للأصوات العربية لا يحتاج مفتاحًا.

## مطلوب منك الآن

سجّل الدخول بـ Google ثم افتح:
https://www.arabya.org/studio/ai

بدون حساب ستُحوَّل إلى صفحة تسجيل الدخول (وليس 404).

التبديل التلقائي عند نفاد الرصيد: المفتاح الجديد أولًا، ثم المفتاح السابق؛ والنماذج بالترتيب MiniMax M2.7 → Kimi K2.6 → DeepSeek V4.

لا تضع المفاتيح في Git. إن أضفت أسرار GitHub Production (`MPT_DAHL_API_KEYS`) تُستخدم بدل القيم على السيرفر.
