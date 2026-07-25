# فحص ayat-creator-pro وخطة الدمج في عربية

تاريخ الفحص: 2026-07-26  
آخر تحديث تنفيذ: 2026-07-26  
المستودع المرجعي: https://github.com/mohamedtaghayen/ayat-creator-pro  
الحالة: **واجهة Lovable كاملة تحت `/create`** + Auth/Plus في عربية؛ بوابة **PayPal لاحقًا**.

---

## ما دُمج في عربية

| المصدر | ماذا أُخذ |
|--------|-----------|
| ayat-creator-pro (Lovable) | الثيم الذهبي/التركوازي، shadcn، Landing، Dashboard، Projects، NewProject، Editor، Exports، Settings، Pexels picker، Audio preview، WebCodecs + visualizer |
| المسار في الكود | `src/ayat-studio/` + مسارات App Router تحت `src/app/[locale]/create/` |

**لم يُدمَج:** Vite standalone، Supabase، alquran.cloud.

نص الآيات من QPC المحلي عبر `/api/create/ayahs`؛ الصوت من EveryAyah (مجلدات القرّاء كما في ayat-creator-pro).

### مسارات المنتج (كما على Lovable)

| المسار | الصفحة |
|--------|--------|
| `/create` | Landing آيات ستوديو |
| `/create/dashboard` | لوحة التحكم |
| `/create/projects` | مشاريعي |
| `/create/projects/new` | مشروع جديد |
| `/create/editor/[id]` | المحرر الكامل |
| `/create/exports` | سجل التصدير |
| `/create/settings` | الإعدادات (مفتاح Pexels محليًا) |
| `/create/image` و`/create/video` | إعادة توجيه إلى مشروع جديد |
| `/pricing` | Free vs Plus |

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
