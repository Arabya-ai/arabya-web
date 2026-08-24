# بيانات حاويات SaaS المعزولة (محلية / Contabo)

هذا المجلد يُنشأ على الخادم عند التشغيل. **لا تُرفع الأسرار ولا شهادات التوقيع إلى Git.**

- `documenso/cert.p12` — يولّدها `scripts/saas-generate-documenso-cert.sh`
- بيانات Postgres/Redis — عبر Docker named volumes (ليست ملفات هنا عادة)

انظر: `docs/plans/arabya-saas-microservices-roadmap-ar.md`
