# دليل المالك — إعداد حسابات عربية (تسجيل Google)

هذا الدليل مكتوب لك خطوة بخطوة. لا تحتاج معرفة برمجة. نفّذ الخطوات بالترتيب وأرسل للمبرمج (الوكيل) النتائج عندما يطلبها.

## أين نحن؟
**المرحلة A — الخطوة 1:** إنشاء مفاتيح تسجيل الدخول عبر Google (مثل «بطاقة دخول» بين موقع عربية وحسابات Gmail).

بدون هذه المفاتيح لا يستطيع الزائر الضغط على «تسجيل الدخول بـ Google» بنجاح.

---

## ماذا ستحصل عليه في النهاية؟
قيمتان سريّتان تضعان في ملف محلي على جهازك (لن تُرفع إلى GitHub):

1. `AUTH_GOOGLE_ID` — معرّف العميل (Client ID)
2. `AUTH_GOOGLE_SECRET` — السرّ (Client Secret)
3. `AUTH_SECRET` — مفتاح عشوائي لحماية الجلسات (سنولّده معًا)
4. `ARABYA_ADMIN_EMAILS` — بريدك ليُعتبر مديرًا

---

## خطوات Google Cloud (انسخها واتبعها)

### 1) افتح وحدة تحكم Google
اذهب إلى: https://console.cloud.google.com/  
سجّل الدخول بنفس جيميل الذي تريد أن يكون حساب المدير.

### 2) أنشئ مشروعًا (أو اختر موجودًا)
1. أعلى الصفحة بجانب «Google Cloud» اضغط قائمة المشاريع.
2. **New Project** / مشروع جديد.
3. الاسم المقترح: `Arabya` أو `arabya-web`.
4. Create / إنشاء، وانتظر حتى يُختار المشروع.

### 3) فعّل شاشة الموافقة OAuth
1. من القائمة الجانبية: **APIs & Services** → **OAuth consent screen**.
2. اختر **External** (خارجي) ثم Create.
3. Application name: `عربية` أو `Arabya`.
4. User support email: اختر بريدك.
5. Developer contact: بريدك مرة أخرى.
6. Save and Continue.
7. في Scopes اضغط Save and Continue دون إضافة معقّدات (الافتراضي يكفي في البداية).
8. في Test users (إن ظهرت وأنت في وضع Testing): **Add users** → أضف بريدك Gmail.
9. Save حتى النهاية.

### 4) أنشئ بيانات اعتماد OAuth
1. **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Arabya Web`.
5. **Authorized JavaScript origins** أضف:
   - `http://localhost:3000`
   - لاحقًا للإنتاج: `https://www.arabyaai.com`
6. **Authorized redirect URIs** أضف بدقة:
   - `http://localhost:3000/api/auth/callback/google`
   - لاحقًا للإنتاج: `https://www.arabyaai.com/api/auth/callback/google`
7. Create.
8. ستظهر نافذة فيها:
   - **Client ID** (انسخه)
   - **Client Secret** (انسخه واحفظه في مكان آمن — يظهر مرة أو يمكن إعادة إنشائه)

### 5) أرسل للمبرمج (أو الصق في المحادثة بحذر)
عند الانتهاء اكتب رسالة مثل:

```
جاهز مفاتيح Google:
Client ID: ....apps.googleusercontent.com
Client Secret: ....
بريد المدير: you@gmail.com
```

**تحذير:** لا تنشر Client Secret في مكان عام (تويتر، لقطة شاشة علنية، مستودع Git عام). في المحادثة الخاصة مع الوكيل داخل مشروعك مقبول مؤقتًا ثم نضعها في ملف `.env.local` فقط.

---

## ماذا سيفعل المبرمج بعد ذلك؟
1. يضع المفاتيح في `.env.local` على جهازك (ملف سري لا يُرفع إلى GitHub).
2. يفعّل زر «دخول» في رأس الموقع → صفحة `/login`.
3. يفتح صفحة `/account` كبداية لوحة المشترك، مع هيكل `/studio` و`/admin`.
4. يطلب منك تجربة الدخول محليًا على `http://localhost:3000`.

---

## تفعيل الدخول على الموقع الحي (Vercel)

بعد نجاح التجربة محليًا، أضف نفس المفاتيح في Vercel حتى يعمل الدخول على https://www.arabyaai.com

### خطوات سريعة
1. افتح: https://vercel.com/dashboard  
2. اختر مشروع **arabya-web** (فريق Arabya).  
3. **Settings** → **Environment Variables**.  
4. أضف المتغيرات التالية لبيئات **Production** و**Preview** و**Development** إن أمكن:

| الاسم | القيمة |
|--------|--------|
| `AUTH_SECRET` | نفس القيمة من `.env.local` على جهازك (أو قيمة جديدة مولَّدة) |
| `AUTH_GOOGLE_ID` | Client ID من Google |
| `AUTH_GOOGLE_SECRET` | Client Secret من Google |
| `ARABYA_ADMIN_EMAILS` | `egywebdev@gmail.com` |
| `AUTH_URL` | `https://www.arabyaai.com` |

5. بعد الحفظ: **Deployments** → افتح آخر نشر على Production → **Redeploy** (إعادة نشر) حتى تُحمَّل المتغيرات.  
6. جرّب: https://www.arabyaai.com/login

### تذكير Google
تأكد أن Redirect URI للإنتاج موجود:
`https://www.arabyaai.com/api/auth/callback/google`

---

## ملاحظات مهمة
- القراءة في المصحف تبقى متاحة **بدون** تسجيل دخول.
- الحسابات المدفوعة غير مشمولة الآن؛ «الاشتراك» هنا = إنشاء حساب عبر Gmail.
- لو تعثّرت في أي شاشة Google: صِف ما تراه (أو أرسل لقطة) وسنكمل من نفس النقطة.
