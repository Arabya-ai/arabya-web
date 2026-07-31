# فحص ayat-creator-pro وخطة الدمج في عربية

تاريخ الفحص: 2026-07-26  
آخر تحديث تنفيذ: 2026-07-31  
المستودع المرجعي: https://github.com/mohamedtaghayen/ayat-creator-pro  
الحالة: **مساران متوازيان** — محرر خفيف تحت `/create` + واجهة Lovable الكاملة تحت `/studio`؛ بوابة **PayPal لاحقًا**.

### مسارات المنتج

| المسار | الصفحة |
|--------|--------|
| `/create` | مركز الإنشاء الخفيف (صورة / فيديو) |
| `/create/image` | محرر PNG freemium (جلسة مطلوبة) |
| `/create/video` | تصدير MP4 (Plus/Pro؛ WebCodecs) |
| `/studio` | Landing عربية ستوديو |
| `/studio/dashboard` | لوحة التحكم |
| `/studio/projects` · `/new` | المشاريع |
| `/studio/editor/[id]` | المحرر الكامل |
| `/studio/exports` · `/settings` | السجل والإعدادات |
| `/studio/queue` · `/sources` | طابور الجودة والمصادر (محررون) |

- حراسة تسجيل دخول عبر middleware على `/create` و`/studio`
- API الصور منفصل عن OG: `/api/create/image`
- تصدير MP4 الخفيف: **Plus/Pro** فقط (Chrome/Edge + WebCodecs)
- الاستوديو الكامل يبقى تحت `/studio` ولا يُستبدل بـ `/create`

### الاشتراك (قبل PayPal)

- `UserPlan`: `free` | `pro` | `plus` في [`src/lib/plans.ts`](../../src/lib/plans.ts)
- منح بلس: بريدات المالك أو `ARABYA_PLUS_EMAILS` أو editor/admin؛ creator → pro
- صفحة مقارنة: `/pricing` (بدون Checkout)
- الدفع لاحقًا: **PayPal**

---

## اختبار يدوي مقترح

1. ضيف يفتح `/create/image` → يُحوَّل لتسجيل الدخول  
2. بعد الدخول (free): PNG مربع بعلامة مائية؛ محاولة مقاس 9:16 → تنويه ترقية  
3. Plus/Pro: مقاسات اجتماعية + فيديو على Chrome  
4. من `/ayah/1/1`: أزرار «صورة» / «فيديو» تملأ `?s=&v=`  
5. `/mushaf/1` بلا تغيّر سلوكي في القراءة/الدراسة  
