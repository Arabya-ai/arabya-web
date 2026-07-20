# Arabya.ai Web

موقع **تفسير كلمات القرآن الكريم** — واجهة عربية (RTL) على Next.js.

## التقنية

- **Next.js + TypeScript + Tailwind**
- **البيانات الآن:** ملفات JSON داخل GitHub (`/data`) — مجانية ومربوطة بالريبو
- **قاعدة البيانات لاحقًا:** Supabase (مجانية) عند الحاجة لحسابات/حفظ/تحرير
- **النشر:** Vercel → الدومين `arabyaai.com` ثم الانتقال إلى `arabya.ai`

## التشغيل محليًا

```bash
npm install
npm run fetch-data   # مرة واحدة لتحميل بيانات السور والكلمات
npm run dev
```

## تحديث بيانات القرآن

```bash
npm run fetch-data
```

المصدر: [Quran.com API v4](https://api.quran.com) (نص عثماني + معاني الكلمات).

## ربط الدومين (مختصر)

1. ادفع الكود إلى GitHub (`Arabya-ai/arabya-web`)
2. استورد المشروع في Vercel
3. أضف الدومين `arabyaai.com` من إعدادات المشروع
4. اضبط سجلات DNS عند مزوّد الدومين حسب تعليمات Vercel
