# حسابات ومزامنة — الحالة الحالية (Contabo)

> **تحديث 2026-08-20:** الإنتاج على **Contabo فقط**. لا Vercel.

## الفكرة ببساطة
- **Contabo VPS** = مكان تشغيل موقع عربية (Next.js + Auth.js + PM2 + Nginx).
- **SQLite على السيرفر** = بيانات الحسابات/المفضّلات عبر `scripts/contabo-ensure-dbs.sh` تحت `/var/lib/arabya`.
- نص القرآن والإعراب يبقى **Git-first** تحت `/data`.

الزائر بلا حساب يستمر على `localStorage` في المتصفح فقط.

## المعمارية المعتمدة
```
المتصفح → https://www.arabya.org على Contabo (Next.js + Auth.js)
                ↓ بعد تسجيل الدخول
         APIs محلية + SQLite على نفس السيرفر
```

## ملاحظة تاريخية (D1)
وثائق أقدم اقترحت Cloudflare D1 كخزانة سحابية اختيارية. ذلك **ليس** مسار النشر الحالي. إن عاد المالك لطلب D1 لاحقًا يُخطط كمزامنة اختيارية — دون نقل الاستضافة عن Contabo.

## متغيرات البيئة (على Contabo فقط)
انظر `docs/platform/hosting-contabo-ar.md` و`docs/platform/contabo-google-and-updates-ar.md`.

## قطع إشارة Vercel الحمراء على GitHub
انظر `docs/platform/disconnect-vercel-github-ar.md`.
