# Provenance — نسب المصادر

كل حزمة بيانات يجب أن تحمل قدر الإمكان:

```json
{
  "source": "اسم المصدر",
  "sourceUrl": "https://…",
  "license": "وصف الترخيص"
}
```

## الوضع الحالي

| المسار | نسب |
|--------|-----|
| `data/irab/*.json` | Quranic Arabic Corpus — GPL |
| `data/irab-index.json` | نفسه |
| `data/roots-index.json` | نفسه |
| `data/tafsirs/` | Quran.com API |
| `data/translations/` | Quran.com API |
| `data/surahs/` | Quran.com QPC Hafs + WBW |

المعنى العربي `meaningAr` مشتق من الصرف (lemma) ويُعرض كمعنى دراسي تقريبي مع تنويه في الواجهة.
