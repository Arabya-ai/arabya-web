# Arabya Knowledge Universe (مؤجّل)

مسار طويل الأمد مستوحى من محادثة المواصفات (Ontology / Entity Catalog / Claims).

**لا يُنفَّذ داخل `arabya-web` الآن.** يُفضَّل ريبو مستقل لاحقًا: `arabya-knowledge`.

## المراحل البعيدة

1. Domain Model أوسع (Hadith, Scholar, Book…)
2. Ontology + Relationship Catalog
3. Claim / Evidence / Provenance كامل
4. Data ingestion pipelines
5. Graph / Search infrastructure عند الحجم الحقيقي
6. AI platform

## ما لن نفعله مبكراً

- Neo4j / Elasticsearch كمطلب إطلاق
- Master Spec بآلاف الصفحات قبل ثبات المنتج
- Google Sheets أو Supabase كقاعدة للمصحف

## الجسر الحالي في arabya-web

- Canonical Word IDs
- Structured morphology + roots index
- `docs/spec/` ADRs والكيانات القرآنية
- Retrieval API خفيف (`/api/study`) كأساس RAG لاحق
