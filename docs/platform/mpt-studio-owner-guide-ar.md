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

## مطلوب منك الآن (خطوة واحدة على Contabo)

افتح SSH على السيرفر ثم الصق في `/var/www/arabya-web/.env.production.local`:

```bash
MONEYPRINTER_API_URL=http://127.0.0.1:8080
MPT_DAHL_API_KEY=مفتاحك_الجديد_من_Dahl
MPT_LLM_MODEL=MiniMaxAI/MiniMax-M2.7
```

ثم نفّذ:

```bash
cd /var/www/arabya-web && bash scripts/contabo-mpt-deploy.sh && pm2 restart arabya-web
```

أو أضف `MPT_DAHL_API_KEY` و `MONEYPRINTER_API_URL` في **GitHub → Settings → Secrets → Production** ثم أعد تشغيل workflow «Deploy Contabo».

**أمان:** المفتاح الذي أُرسل في الدردشة سابقًا يُفضّل إلغاؤه واستبداله بمفتاح جديد.
