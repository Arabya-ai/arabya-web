# قطع ارتباط Vercel عن GitHub (مرة واحدةحدة)

الإنتاج = **Contabo فقط**. الإشارة الحمراء `Vercel — Account is blocked` تأتي من تطبيق قديم مربوط بـ GitHub، وليست من سيرفر عربية.

لا تحتاج فتح لوحة Vercel لأي نشر. الهدف هنا: **إيقاف الإشارة الحمراء نهائيًا**.

---

## الخطوات (مرّة واحدة)

### أ) من GitHub (الأفضل)

1. افتح: https://github.com/Arabya-ai/arabya-web/settings/installations  
   (أو: المستودع → **Settings** → **Integrations** / **GitHub Apps**)
2. ابحث عن تطبيق اسمه **Vercel**
3. اضغط **Configure** ثم **Uninstall** / **Suspend** أو أزل صلاحية المستودع `arabya-web`
4. اختياري: من صفحة المستودع → ⚙️ **Settings** → مرّر إلى **About** → امسح رابط `arabya-web.vercel.app` إن وُجد، وضع `https://www.arabya.org`

### ب) إن بقي مشروع في حساب Vercel قديم

1. ادخل حساب Vercel فقط لهذه الخطوة  
2. افتح المشروع المرتبط بـ `arabya-web`  
3. **Settings** → **Git** → **Disconnect**  
4. لا تنشر من هناك أبدًا

---

## ماذا تنظر إليه بعد ذلك؟

| الفحص | المعنى |
|--------|--------|
| **CI** (GitHub Actions) | بناء واختبار الكود |
| **Deploy Contabo** | النشر الحقيقي إلى السيرفر |
| Vercel | يجب أن يختفي — تجاهله إن ظهر قبل الخطوة أعلاه |

الموقع الحي: **https://www.arabya.org**
