# كيانات الحديث والتراث

مفعّل للتنفيذ المتوازي مع القرآن (موافقة توسعة OSS 2026-08-20).

## Hadith

| الحقل | الوصف |
|-------|--------|
| `hadithId` | معرّف مستقر (مثلاً `H:bukhari:1`) |
| `collection` | البخاري، مسلم… (`slug` في `data/hadith/index.json`) |
| `number` | رقم داخل المجموعة |
| `arabic` | متن عربي |
| `grade` | اختياري (صحيح / حسن…) مع `source` |
| `words[]` | واجهة: توكنات على المتن + Word IDs `HW:{collection}:{number}:{PPP}` |
| طبقات | صرف · نحو · دلالة · بلاغة · معجم · ترجمة (Claims عند الاختلاف) — UI جاهز؛ بيانات الصرف تُملأ تدريجيًا |
| `isnad` | اختياري: `narrators[]` + `narratorEn` من overlay في `data/hadith/isnad/` |

ملفات: `data/hadith/index.json` · `data/hadith/collections/*.json` · `data/hadith/isnad/*.json` · `src/lib/hadith.ts` · `src/lib/hadith-isnad.ts` · `/api/hadith/search`.

## Heritage / Poetry

| الحقل | الوصف |
|-------|--------|
| `workId` | كتاب/ديوان (`slug`) |
| `passageId` | مقطع داخل العمل |
| `textAr` | نص المقطع |
| `meter` / `prosody` | اختياري (عروض) |
| `words[]` | لاحقًا: `TW:…` Word IDs |
| `license` | حالة الترخيص/المصدر |

ملفات: `data/heritage/index.json` · `data/heritage/works/*.json` · `src/lib/heritage.ts`.

## مبادئ مشتركة مع القرآن

- Claims + provenance لكل طبقة عند توفر مصادر متعددة
- جلب البيانات: APIs، ملفات المالك، أو استيراد/سكرابينج عند توجيه المالك
- محرّك تحليل واحد في `src/lib/` يُعمَّم تدريجيًا — لا تكسر المصحف أو الأذكار أو المكتبة
