# كيانات القرآن الحالية (arabya-web)

نطاق المرحلة 2 — الكيانات المستخدمة فعليًا في المنتج:

| الكيان | المعرّف | ملاحظات |
|--------|---------|---------|
| Surah | `1`–`114` | `data/surahs/{id}.json` |
| Ayah | `{surah}:{verse}` | مثل `2:255` |
| WordOccurrence | `W:SSS:VVV:PPP` | انظر `src/lib/word-id.ts` |
| Root | سلسلة عربية | فهرس `data/roots-index.json` |
| Lemma | مادة صرفية | من Corpus |
| TafsirEdition | slug | مثل `saadi` |
| TranslationEdition | slug | مثل `saheeh-en` |
| MushafPage | `1`–`604` | `data/mushaf-index.json` |

علاقات أساسية:

- WordOccurrence → Ayah → Surah
- WordOccurrence → Root / Lemma
- Ayah → MushafPage
- Ayah → TafsirEdition text / TranslationEdition text
