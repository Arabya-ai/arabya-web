# مصادر بيانات الحديث

| مشروع (قائمة الـ320 / ملاءمة عربية) | الاستخدام |
|---|---|
| [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | متون عربية كاملة + طبعة إنجليزية لحقل الراوي (`Narrated…`) |
| [mhashim6/Open-Hadith-Data](https://github.com/mhashim6/Open-Hadith-Data) | مسند أحمد + سنن الدارمي (CSV) |
| استخراج سند محلي (`scripts/build-hadith-isnad-overlay.mjs`) | حقول `narrators[]` / `narratorEn` فوق `H:collection:number` |
| [R3GENESI5/Itqan](https://github.com/R3GENESI5/Itqan) | مرجع منهجية أفعال التحديث — **لا** نستنسخ قواعدهم كاملة |

## مؤجّل (حجم / بوابة)

| مصدر | السبب |
|---|---|
| emadjumaah/hadith-kg | SQLite ~1.6GB — خارج حدود Git |
| JehadOumer Ifta (`chain_of_narrators`) | بيانات Kaggle كبيرة — تحتاج موافقة مالك + مسار استيراد منفصل |

أعد الاستيراد:

```bash
npm run import-hadith-oss
npm run import-open-hadith-data
npm run build-hadith-isnad
```

آخر تحديث: 2026-08-20
