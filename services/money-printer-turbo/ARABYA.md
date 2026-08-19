# MoneyPrinterTurbo داخل عربية

هذه نسخة كاملة من [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) (رخصة MIT، © Harry) تعمل **كخدمة شقيقة** بجانب موقع عربية.

- **لا تُخلط** مع محرّر آيات `/studio`.
- واجهة عربية للمستخدم: `/studio/ai` عبر Next.js.
- هذا المجلد هو محرّك Python/ffmpeg فقط (`python main.py` على المنفذ 8080).
- Streamlit الأصلي (`webui/`) اختياري للمالك محليًا — الزائر لا يفتحه.

## تشغيل المحرك

من جذر مستودع عربية:

```bash
docker compose -f docker-compose.mpt.yml up --build
```

أو من هذا المجلد بعد `uv sync` أو `pip install -r requirements.txt`:

```bash
cp config.example.toml config.toml   # ثم أضف مفاتيح LLM وPexels
python main.py                       # http://127.0.0.1:8080/docs
```

ثم في `.env.local` لعربية:

```
MONEYPRINTER_API_URL=http://127.0.0.1:8080
PEXELS_API_KEY=...
```

التوليد يجلب المشاهد من Pexels عبر API. لا تعتمد على مجلد `storage/local_videos`.

ملفات `resource/songs/*.mp3` والخطوط الصينية الضخمة `*.ttc` غير مضمّنة في Git (حجم وترخيص). إن احتجتها انسخها من المستودع الأصلي إلى نفس المسارات.

دليل المالك: `docs/platform/mpt-studio-owner-guide-ar.md`
