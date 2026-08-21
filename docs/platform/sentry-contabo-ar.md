# Sentry على Contabo (سوبر أدمن)

التتبّع يعمل عبر Sentry السحابي؛ الاستضافة تبقى Contabo. بدون DSN التطبيق يعمل كالمعتاد.

## خطوات المالك

1. افتح [sentry.io](https://sentry.io) وأنشئ مشروع **Next.js** باسم مثل `arabya-web`.
2. انسخ **DSN** من إعدادات المشروع.
3. أنشئ **Auth Token** بصلاحية قراءة المشاكل (`project:read`, `event:read`) إن أردت جدول الأخطاء داخل عربية.
4. على السيرفر عبر PuTTY:

```bash
cd /var/www/arabya-web
nano .env
```

أضف:

```env
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=arabya-web
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ENVIRONMENT=contabo
NEXT_PUBLIC_SENTRY_ENVIRONMENT=contabo
```

5. أعد تشغيل التطبيق:

```bash
pm2 restart arabya-web --update-env
```

6. ادخل بحساب السوبر أدمن إلى:  
   `https://www.arabya.org/admin/ops?tab=sentry`  
   ثم اضغط **إرسال خطأ تجريبي** و**تحديث**.

## أين تظهر في الواجهة؟

- `/admin/ops` → تبويب **المراقبة**: بطاقة حالة Sentry + arabya-nlp  
- `/admin/ops?tab=sentry` → قائمة المشاكل + دليل الإعداد
