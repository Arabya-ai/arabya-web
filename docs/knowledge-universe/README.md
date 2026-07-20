# Arabya Knowledge Universe

مسار طويل الأمد: Ontology / Entity Catalog / Claims، مع توسيع نطاق النص المحلَّل.

## تسلسل المنتج

1. **القرآن** (الجاري في `arabya-web`) — تحليل كلمة بكلمة بست طبقات
2. **الأحاديث** — نفس محرّك التحليل و Word IDs
3. **الشعر والتراث** (المكتبة الشاملة، استيراد مرخّص) — نفس التحليل
4. **Graph / Knowledge Universe** — ريبو مستقل مفضّل: `arabya-knowledge`

## المراحل البعيدة (التقنية)

1. Domain Model أوسع (Hadith, Scholar, Book, Poem…)
2. Ontology + Relationship Catalog
3. Claim / Evidence / Provenance كامل
4. Data ingestion pipelines
5. Graph / Search infrastructure عند الحجم الحقيقي
6. AI platform

انظر أيضًا:

- [`docs/spec/entities-hadith-heritage.md`](../spec/entities-hadith-heritage.md) — مسودة كيانات الحديث والتراث
- [`docs/platform/books-irab.md`](../platform/books-irab.md) — استيراد كتب الإعراب المرخّصة
- [`docs/platform/rag-llm.md`](../platform/rag-llm.md) — RAG بـ LLM فوق الاسترجاع المحلي

## ما لن نفعله مبكراً

- Neo4j / Elasticsearch كمطلب إطلاق
- Master Spec بآلاف الصفحات قبل ثبات المنتج
- Google Sheets أو Supabase كقاعدة للمصحف
- سكرابينج مواقع المنافسين أو كتب محمية بلا إذن

## الجسر الحالي في arabya-web

- Canonical Word IDs (`W:SSS:VVV:PPP`)
- Structured morphology + roots index
- طبقات الدراسة في الواجهة (صرف / إعراب / معنى / معجم / ترجمة / بلاغة)
- Claims UI لمصادر الإعراب (QAC الآن؛ كتب مرخّصة لاحقًا)
- `/api/study` كأساس RAG
- `docs/spec/` ADRs والكيانات القرآنية
