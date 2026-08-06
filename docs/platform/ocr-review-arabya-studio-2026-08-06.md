# تقرير مراجعة OpenCodeReview — عربية + الاستوديو

تاريخ الفحص: 2026-08-06  
الأداة: [alibaba/open-code-review](https://github.com/alibaba/open-code-review) v1.8.8  
الوضع: **Delegation** (OCR يحدد الملفات والقواعد؛ المراجعة عبر وكيل Cursor لأن لا يوجد مفتاح LLM لـ OCR)

## ما تم فحصه

| النطاق | المسارات |
|--------|----------|
| الاستوديو | `src/ayat-studio/**`, `src/app/[locale]/studio/**`, `src/app/api/studio/**`, `src/app/api/create/**` |
| نواة عربية | `src/auth.ts`, `src/lib/cloud-sync.ts`, `src/lib/require-role.ts`, `src/app/api/admin/**`, Worker `workers/arabya-sync` |

قواعد OCR المطبّقة: أمان (XSS/أسرار/حقن)، جودة TypeScript/React، معالجة أخطاء async، عدم تسرّب معلومات حساسة.

## الحكم المختصر

**مشروط — بعد إصلاحات أمنية نُشرت في نفس الجلسة.**  
لا يوجد حقن SQL ظاهر (استعلامات Worker معلَّمة). بوابات الجلسة على مسارات الاستوديو/الإنشاء موجودة. بقيت تحسينات متوسطة (حصص محلية، حدود معدّل لمفاتيح Pexels).

## إصلاحات نُفّذت بعد الفحص

1. منع Path Traversal في `/api/create/image` عبر allowlist لإصدارات الترجمة + رفض الجلسات المحظورة.
2. `requireSession` يرفض `session.error === "Banned"` على واجهات API.
3. عند تعطّل Worker: لا تُمسَح حالة الحظر السابقة من JWT.
4. Worker لا يثق بـ `body.ensureAdmin` — الترقية فقط من allowlist السيرفر.
5. CORS على Worker مقيّد لأصول عربية بدل `*`.
6. مقارنة سرّ المزامنة أقرب لـ constant-time.
7. واجهة `/api/site-appearance` العامة لم تعد تكشف تشخيص المزامنة.
8. رفع مصادر الاستوديو يتطلب أدوات تحريرية (`editor`/`admin`) ورسائل خطأ غير تفصيلية.
9. صفحة الدخول لا تعيد توجيه المحظور في حلقة.

## ملاحظات متبقية (متوسطة / منخفضة — لاحقاً)

| الشدة | الموضوع |
|-------|---------|
| medium | حصص تصدير الفيديو في `localStorage` فقط — يمكن تجاوزها من المتصفح |
| medium | مفاتيح Pexels/Pixabay الاختيارية في `localStorage` (سطح XSS) |
| medium | مسارات Pexels/Pixabay بلا حد معدّل لكل مستخدم على مفاتيح السيرفر |
| low | `as any` في تصدير الفيديو لمتصفح Safari |
| low | ternaries متداخلة في رسائل خطأ quran-api |

## تشغيل الأداة لاحقاً

```bash
# مثبتة على الجهاز السحابي:
~/.local/bin/ocr version

# معاينة نطاق الاستوديو
ocr scan --preview --path 'src/ayat-studio,src/app/api/studio,src/app/api/create'

# وضع التفويض (بدون مفتاح LLM)
ocr delegate preview
ocr delegate rule <ملف1> <ملف2>

# مراجعة كاملة عبر OCR تحتاج مفتاح نموذج:
export OCR_LLM_URL=...
export OCR_LLM_TOKEN=...
export OCR_LLM_MODEL=...
ocr scan --path src/ayat-studio
```

مهارات Cursor نُسخت إلى `.cursor/skills/open-code-review*` للاستخدام المستقبلي.
