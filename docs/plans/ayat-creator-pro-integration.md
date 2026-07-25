# فحص ayat-creator-pro وخطة الدمج في عربية

تاريخ الفحص: 2026-07-26  
آخر تحديث تنفيذ: 2026-07-26  
المستودع المرجعي: https://github.com/mohamedtaghayen/ayat-creator-pro  
الحالة: **واجهة Lovable تحت `/studio`** (مع redirects من `/create`)؛ بوابة **PayPal لاحقًا**.

### مسارات المنتج

| المسار | الصفحة |
|--------|--------|
| `/studio` | Landing عربية ستوديو |
| `/studio/dashboard` | لوحة التحكم |
| `/studio/projects` · `/new` | المشاريع |
| `/studio/editor/[id]` | المحرر |
| `/studio/exports` · `/settings` | السجل والإعدادات |
| `/studio/queue` · `/sources` | طابور الجودة والمصادر (محررون) |
| `/create/*` | إعادة توجيه إلى `/studio/*` |

- بدون SiteHeader/Footer داخل `/create` (تجربة غامرة مثل Lovable)
- حراسة تسجيل دخول عبر middleware على `/create`
- تصدير MP4: **Plus** فقط (Chrome/Edge)

### الاشتراك (قبل PayPal)

- `UserPlan`: `free` | `plus` في [`src/lib/plans.ts`](../../src/lib/plans.ts)
- منح بلس: بريدات المالك أو `ARABYA_PLUS_EMAILS` أو editor/admin
- الدفع لاحقًا: **PayPal**

---

## اختبار يدوي مقترح

1. ضيف يفتح `/create` → يُحوَّل لتسجيل الدخول  
2. بعد الدخول: Landing بثيم ذهبي/ليل + «ادخل الاستوديو»  
3. مشروع جديد → محرر بجميع اللوحات (خلفية، نص، صوت، visualizer)  
4. Free: تصدير MP4 يظهر تنويه بلس؛ Plus: تصدير يعمل على Chrome  
5. `/mushaf/1` بلا تغيّر سلوكي  
