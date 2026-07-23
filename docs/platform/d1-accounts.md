# حسابات ومزامنة عبر Cloudflare D1

## الفكرة ببساطة
- **Vercel** = مكان تشغيل موقع عربية (الصفحات والدخول بـ Google) — يبقى كما هو الآن.
- **Cloudflare D1** = خزانة بيانات المشتركين (مفضّلات، ملاحظات، عادة قراءة) — منفصلة عن نص القرآن في Git.

الزائر بلا حساب يستمر على `localStorage` في المتصفح فقط.

## المعمارية المعتمدة (مرحلة B)
```
المتصفح → موقع عربية على Vercel (Next.js + Auth.js)
                ↓ بعد تسجيل الدخول
         Cloudflare Worker (واجهة مزامنة)
                ↓
              قاعدة D1
```

لا ننقل الموقع كله إلى Cloudflare الآن. نربط **قاعدة D1 فقط** عبر Worker خفيف.

## جداول D1 المقترحة
- `users` — ربط بريد/معرّف Google
- `bookmarks` — المفضّلات
- `ayah_notes` — ملاحظات الآيات
- `reading_progress` — آخر صفحة + عادة القراءة (ملخص)

## متغيرات البيئة (لاحقاً — ليست في Git)
على Vercel:
- `ARABYA_D1_ENABLED=1`
- `ARABYA_SYNC_URL` — عنوان الـ Worker
- `ARABYA_SYNC_SECRET` — سر مشترك بين Vercel والـ Worker

على Cloudflare Worker:
- ربط D1 باسم مثل `arabya_db`
- نفس `ARABYA_SYNC_SECRET`

## الحالة في الكود
- المحلي: [`src/lib/bookmarks.ts`](../../src/lib/bookmarks.ts) وغيرها
- هيكل سحابي قديم: [`src/lib/cloud-bookmarks.ts`](../../src/lib/cloud-bookmarks.ts) — سيُوسَّع للمزامنة الكاملة

## خطوات المالك — انظر
[`accounts-owner-guide-ar.md`](./accounts-owner-guide-ar.md) قسم «المرحلة B — Cloudflare D1».
