# مصادر بيانات الحديث

| مشروع | الاستخدام في عربية |
|---|---|
| [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) | متون عربية **مستوردة** تحت `data/hadith/collections` + إثراء حي من CDN (راوي إنجليزي / درجات) |
| [mhashim6/Open-Hadith-Data](https://github.com/mhashim6/Open-Hadith-Data) | مسند أحمد + الدارمي (CSV → JSON محلي) |
| استخراج سند حي | `src/lib/hadith-isnad-parse.ts` من المتن المحلي + `cdn.jsdelivr` للطبعة الإنجليزية — **بدون** ملفات إسناد متعددة الميجابايت في Git |

## بيانات كبيرة — تُعرض من المصدر (لا تُحمَّل للمستودع)

| مصدر | الأسلوب |
|---|---|
| fawazahmed0 eng/ara per-hadith JSON | `/api/hadith/remote-enrich` + جلب راوي أثناء عرض الصفحة |
| emadjumaah/hadith-kg (~1.6GB) | مؤجّل — لا SQLite في Git؛ يحتاج استضافة منفصلة إن رغبت لاحقاً |
| JehadOumer Ifta | مؤجّل (Kaggle) |

```bash
npm run import-hadith-oss
npm run import-open-hadith-data
npm run verify-oss-imports
npm run verify-oss-imports:live   # يختبر CDN + GitHub
# اختياري فقط لتخزين مؤقت محلي:
npm run build-hadith-isnad
```
