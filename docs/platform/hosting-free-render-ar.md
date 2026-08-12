# استضافة مجانية بديلة عن Vercel — Render

Vercel أوقف الموقع لأن الخطة المجانية تجاوزت الحد.  
**الحل الآن:** نشر نفس المشروع على **Render** (مجاني) دون انتظار تصفير Vercel.

| | Vercel (متوقف) | Render (البديل) |
|--|----------------|-----------------|
| التكلفة | مجاني لكن توقف بعد التجاوز | مجاني |
| تشغيل Next.js + مجلد `/data` | نعم | نعم (Node كامل) |
| عيب | حدود نقل بيانات قاسية | بعد ~15 دقيقة بدون زوار قد «ينام» الموقع ويفتح ببطء أول مرة |

---

## مطلوب منك الآن (بالترتيب)

### 1) حساب Render
1. افتح: https://dashboard.render.com/register  
2. سجّل الدخول بـ **GitHub** (نفس حساب `Arabya-ai`).  
3. وافق على ربط المستودع إن طُلب.

### 2) إنشاء الخدمة من الملف الجاهز
1. من لوحة Render: **New +** → **Blueprint**  
   (أو New → Web Service إن لم يظهر Blueprint).  
2. اختر المستودع: `Arabya-ai/arabya-web`  
3. إن ظهر Blueprint من ملف `render.yaml` في جذر المشروع → **Apply**.  
4. إن أنشأت **Web Service** يدوياً:
   - **Name:** `arabya-web`
   - **Region:** Frankfurt (أو الأقرب)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start`
   - **Instance type:** **Free**

### 3) متغيرات البيئة (مهم جداً)
من صفحة الخدمة → **Environment** انسخ نفس القيم التي كانت في Vercel:

| المفتاح | ملاحظة |
|---------|--------|
| `AUTH_SECRET` | نفس السر القديم |
| `AUTH_GOOGLE_ID` | من Google Cloud |
| `AUTH_GOOGLE_SECRET` | من Google Cloud |
| `AUTH_URL` | مؤقتاً: رابط Render مثل `https://arabya-web.onrender.com` ثم بعد ربط النطاق `https://www.arabya.org` |
| `ARABYA_ADMIN_EMAILS` | بريدك كمدير |
| أي مفاتيح استوديو (`PEXELS_API_KEY` …) | إن وُجدت |

احفظ ثم انتظر انتهاء أول Deploy (قد يستغرق عدة دقائق بسبب حجم البيانات).

### 4) جرّب الرابط المجاني أولاً
بعد نجاح النشر ستظهر وصلة مثل:
`https://arabya-web.onrender.com`

افتحها وتأكد أن الصفحة الرئيسية تعمل.

### 5) Google تسجيل الدخول (بعد الرابط)
1. https://console.cloud.google.com/ → بيانات الاعتماد → عميل OAuth  
2. أضف:
   - **Authorized JavaScript origins:** رابط Render (ولاحقاً `https://www.arabya.org`)  
   - **Authorized redirect URIs:**  
     `https://arabya-web.onrender.com/api/auth/callback/google`  
     وبعد ربط النطاق:  
     `https://www.arabya.org/api/auth/callback/google`

### 6) ربط النطاق `www.arabya.org` (بعد نجاح الخطوة 4)
1. في Render → الخدمة → **Settings → Custom Domains** → أضف `www.arabya.org`  
2. انسخ سجلات DNS التي يعرضها Render  
3. في Cloudflare/مسجّل النطاق ضع تلك السجلات  
4. حدّث `AUTH_URL` إلى `https://www.arabya.org` وأعد Deploy  
5. (اختياري) أوقف مشروع Vercel أو اتركه متوقفاً — لا تعتمد عليه

---

## ماذا أرسل للمبرمج بعد الخطوة 4؟
```
Render جاهز:
- الرابط: https://….onrender.com
- Deploy: نجاح / فشل (انسخ رسالة الخطأ إن فشل)
- النطاق: لم يُربط بعد / تم
```

---

## ملاحظات مهمة
- أول زيارة بعد النوم قد تستغرق 30–60 ثانية — طبيعي على الخطة المجانية.  
- لا تضغط Upgrade على Vercel.  
- لاحقاً يمكن الانتقال إلى Cloudflare عندما نخفّف حجم البيانات أو ننقل الملفات الثقيلة إلى R2.
