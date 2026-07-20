# حسابات Cloudflare D1 (لاحقًا)

عند قرار إطلاق حسابات / مفضّلات سحابية:

1. أنشئ مشروع Cloudflare + قاعدة D1
2. جداول مقترحة: `users`, `bookmarks`, `progress`
3. اربط مفاتيح البيئة في Vercel فقط (ليست في Git)
4. أبقِ `localStorage` كوضع افتراضي للزائر بلا حساب

الواجهة الحالية تستخدم [`src/lib/bookmarks.ts`](../../src/lib/bookmarks.ts) محليًا.
الطبقة السحابية جاهزة للربط عبر [`src/lib/cloud-bookmarks.ts`](../../src/lib/cloud-bookmarks.ts) عند تفعيل `ARABYA_D1_ENABLED=1`.
