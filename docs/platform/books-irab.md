# كتب الإعراب المرخّصة (مرحلة C)

## الهدف

دمج كتب إعراب (درويش، التبيان، الخراط، الدعاس…) **بعد تسليم ملفات مرخّصة من المالك** — بدون سكرابينج.

## تخطيط البيانات

```
data/books/
  index.json          # catalog: slug, title, license, status
  {slug}/
    meta.json
    verses/{surahId}.json   # optional alignment to verseKey / wordId
```

## الحالة

- `status: "ready"` — محتوى متاح للعرض
- `status: "awaiting_license"` — مدخل في الفهرس فقط

## الواجهة

- `/books` — فهرس الكتب
- `/books/[slug]` — عارض فصول/آيات
- مبدّل مصادر الإعراب في لوحة الدراسة (Claims)

## سكربت الاستيراد

`npm run import-irab-book -- --slug=darwish --from=./incoming/darwish`

يتوقع JSON موحّد؛ لا يستورد HTML من مواقع خارجية.
