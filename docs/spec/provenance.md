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
| `data/tafsirs/` | Quran.com API (`source` / `sourceUrl` في الفهرس) |
| `data/translations/` | Quran.com API (`source` / `sourceUrl` في الفهرس) |
| `data/surahs/` | Quran.com QPC Hafs + WBW |
| `data/sources/lemma-sense-ar.json` | معانٍ دراسية أصيلة لعربية؛ مفاتيح lemma من QAC |

المعنى العربي `meaningAr` معنى دراسي مختصر مشتق من lemma عبر `lemma-sense-ar` مع تنويه وظيفي في طبقة الترجمة (بدون لوحة مصادر).

قناة اقتناء محلية: `docs/platform/internet-archive.md` — لا تنشر إلى `data/` تلقائيًا.
