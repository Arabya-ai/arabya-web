# دليل المالك — إعداد حسابات عربية (تسجيل Google + مزامنة D1)

هذا الدليل مكتوب لك خطوة بخطوة. لا تحتاج معرفة برمجة. نفّذ الخطوات بالترتيب وأرسل للمبرمج (الوكيل) النتائج عندما يطلبها.

## أين نحن؟
- **المرحلة A:** تسجيل الدخول بـ Google — **تمت** على المحلي والموقع الحي.
- **المرحلة B:** مزامنة المفضّلات/الملاحظات/عادة القراءة عبر **Cloudflare D1**.

---

## المرحلة A — Google (مرجع سريع إن احتجت إعادة الإعداد)

### ماذا تحتاج؟
1. `AUTH_GOOGLE_ID` — معرّف العميل (Client ID)
2. `AUTH_GOOGLE_SECRET` — السرّ (Client Secret)
3. `AUTH_SECRET` — مفتاح عشوائي لحماية الجلسات
4. `ARABYA_ADMIN_EMAILS` — بريدك ليُعتبر مديرًا

### خطوات Google Cloud
1. https://console.cloud.google.com/ — مشروع Arabya  
2. OAuth consent screen → External  
3. Credentials → OAuth client ID → Web application  
4. Origins: `http://localhost:3000` و `https://www.arabyaai.com`  
5. Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://www.arabyaai.com/api/auth/callback/google`  
6. نفس القيم في Vercel → Environment Variables → Redeploy  

**تنبيه:** `AUTH_GOOGLE_ID` يجب أن يكون معرّفًا ينتهي بـ `.apps.googleusercontent.com` — **ليس** رابط `callback/google`.

---

## المرحلة B — Cloudflare D1 (المسار الحالي)

### توضيح: Vercel و D1 ليسا بديلين
| الاسم | الدور |
|--------|--------|
| **Vercel** | يستضيف موقع عربية (الصفحات + دخول Google) — **يبقى** |
| **Cloudflare D1** | خزانة بيانات المشترك للمزامنة — **نضيفها الآن** |

المتصفح → موقع عربية على Vercel → بعد الدخول → عامل Cloudflare (Worker) → قاعدة D1.

الزائر بلا حساب يبقى على تخزين الجهاز فقط. نص القرآن يبقى في Git.

### الخطوة B1 — حساب Cloudflare
1. افتح: https://dash.cloudflare.com/sign-up  
2. سجّل (يُفضّل `egywebdev@gmail.com`).  
3. أكّد البريد إن طُلب.  
4. ادخل: https://dash.cloudflare.com/

### الخطوة B2 — إنشاء قاعدة D1
1. من القائمة: **Workers & Pages** → **D1** (أو ابحث عن D1 أعلى الصفحة).  
2. **Create database**.  
3. الاسم بالضبط:
   ```
   arabya-user-data
   ```
4. المنطقة: الأقرب (Western Europe إن وُجدت).  
5. Create.  
6. تأكد أن صفحة القاعدة تعرض الاسم `arabya-user-data`.

### الخطوة B3 — أرسل للمبرمج
```
جاهز Cloudflare D1:
- الحساب: نعم
- اسم القاعدة: arabya-user-data
```
لقطة شاشة مفيدة إن ظهرت شاشة غير واضحة.

### الخطوة B4 — إنشاء الجداول (مرة واحدة)
1. افتح قاعدة `arabya-user-data` في Cloudflare.  
2. من التبويبات أعلى الصفحة اختر **Console** (أو **Explore Data** / محرر SQL).  
3. امسح أي نص قديم في المربع.  
4. الصق محتوى الملف من المشروع:
   `workers/arabya-sync/schema.sql`  
   (أو اطلب من المبرمج لصق النص الكامل في المحادثة).  
5. اضغط **Run** / تنفيذ.  
6. ارجع لتبويب **Overview** — يجب أن يصبح **Number of Tables** = **4**  
   (`users`, `bookmarks`, `ayah_notes`, `reading_progress`).

ثم اكتب للمبرمج: `الجداول جاهزة — 4 جداول`

### الخطوة B5 — نشر عامل المزامنة (مع المبرمج)
المبرمج يجهّز المجلد `workers/arabya-sync`. أنت تحتاج مرة واحدة:

1. في Cursor/الطرفية (المبرمج يشغّلها معك): تسجيل دخول Cloudflare CLI.  
2. سيُفتح متصفح — اسمح لـ Wrangler بالوصول لحسابك.  
3. بعد النجاح ينشر المبرمج الـ Worker ويربط السرّ `ARABYA_SYNC_SECRET`.  
4. تضيف في Vercel:
   - `ARABYA_D1_ENABLED=1`
   - `ARABYA_SYNC_URL` = رابط الـ Worker (مثل `https://arabya-sync.…workers.dev`)
   - `ARABYA_SYNC_SECRET` = نفس السرّ  
5. Redeploy لموقع عربية.  
6. من صفحة **حسابي**: ارفع ثم اسحب للتجربة.

### بعد تأكيدك سيفعل المبرمج
1. نشر Worker المزامنة.  
2. ربط الأسرار في Vercel و Cloudflare.  
3. تجربة الرفع/السحب معك على صفحة حسابي.

---

## المرحلة C — لوحات التحكم (حساب / محرر / أدمن)

### ماذا أُضيف؟
- **لوحة المشترك** (`/account`): نظرة عامة + طلب ترقية لمحرر.
- **الاستوديو** (`/studio`): للمحرر بعد موافقة الأدمن.
- **إدارة عربية** (`/admin`): إحصائيات، مستخدمون، طلبات ترقية، سجل أدوار، إعدادات.

### مطلوب منك مرة واحدة على D1
1. افتح قاعدة `arabya-user-data` → Console.  
2. نفّذ محتوى الملف: `workers/arabya-sync/schema-migrate.sql`  
   (إن ظهر خطأ «duplicate column» تجاهله للجداول/الأعمدة الموجودة).  
3. على Worker في Cloudflare → Settings → Variables أضف إن أمكن:
   - `ARABYA_ADMIN_EMAILS` = نفس بريدك في Vercel  
4. بعد نشر Worker الجديد من المبرمج: ادخل بحسابك → **إدارة عربية**.

### كيف ترقّي محررًا؟
1. المستخدم يطلب من «حسابي» → طلب محرر.  
2. أنت من `/admin/requests` توافق أو ترفض.  
3. أو من `/admin/users` اضغط «ترقية لمحرر».

### حدود مهمة
- الأدمن الأعلى يبقى عبر `ARABYA_ADMIN_EMAILS` ولا يُحذف من الواجهة.  
- حذف مستخدم = مسح بياناته السحابية فقط.  
- محتوى القرآن ما زال Git-first (لا تعديل ملفات `/data` من اللوحة في هذه المرحلة).

---

## ملاحظات مهمة
- القراءة في المصحف تبقى متاحة **بدون** تسجيل دخول.
- «الاشتراك» هنا = حساب عبر Gmail (ليس دفعًا).  
- لو تعثّرت: صِف الشاشة أو أرسل لقطة وسنكمل من نفس النقطة.
