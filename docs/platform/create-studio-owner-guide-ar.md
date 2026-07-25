# دليل المالك — آيات ستوديو داخل عربية

آخر تحديث: 2026-07-26

## ماذا ترى الآن

واجهة **آيات ستوديو** من Lovable بالكامل تحت `/create` (ثيم ليلي ذهبي/تركوازي، شريط جانبي، مشاريع، محرر، تصدير).

## خطوات سريعة

1. سجّل الدخول بحسابك (المالك بلس تلقائيًا: `egywebdev@gmail.com` / `arabyaaicom@gmail.com`).
2. افتح `/create` — صفحة الهبوط ثم «ادخل الاستوديو».
3. **مشروع جديد** من `/create/projects/new` → المحرر.
4. صدّر MP4 من لوحة التصدير (Chrome أو Edge). الخطة المجانية تستكشف المحرر؛ التصدير لبلس.
5. اختياري: مفتاح Pexels في `/create/settings` (يُحفظ محليًا في المتصفح).

## المسارات

| المسار | الوظيفة |
|--------|---------|
| `/create` | Landing |
| `/create/dashboard` | الرئيسية |
| `/create/projects` | قائمة المشاريع (localStorage) |
| `/create/editor/[id]` | المحرر |
| `/create/exports` | سجل التصدير |
| `/create/settings` | إعدادات + Pexels |
| `/pricing` | Free / Plus |

## تقنية

- واجهة: `src/ayat-studio/`
- آيات: `/api/create/ayahs` (QPC محلي)
- فيديو: `src/ayat-studio/lib/video-export.ts` + visualizer
- المشاريع: localStorage (`ayat_projects`)

## PayPal

غير مفعّل بعد — الترقية يدويًا عبر البريد/الدور حتى Webhook PayPal.
