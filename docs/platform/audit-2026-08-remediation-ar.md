# تدقيق أغسطس 2026 — إصلاحات الكود وما يبقى على Contabo

تاريخ المرجع: 21 أغسطس 2026. هذا الملف يترجم تقرير التدقيق الشامل إلى خطوات عملية للمالك وللوكلاء.

## مصدر الحقيقة (C-01)

| المكان | الدور |
|--------|--------|
| مستودع GitHub `arabya-web` | الكود |
| `/var/www/arabya-web` على Contabo | التطبيق الحي (PM2 `arabya-web` → `next start -p 3000`) |
| LiteSpeed / Cloudflare | الواجهة العامة |
| `public_html` / ServerAvatar webroot | **ليس** تطبيق عربية — لا تعدّل منه ولا تفحصه كباك إند |

بعد كل نشر ناجح يطبع `scripts/contabo-deploy.sh` الـcommit المنشور. طابقّه مع GitHub عند الحوادث.

## 503 (C-02)

النشر يوقف الخدمة أثناء `npm ci`/`build` ثم يعيدها بعد smoke موسّع (`/`, `/robots.txt`, `/sitemap.xml`, `/mushaf/1`, `/about`). إن فشل الـsmoke يُرجع `.next.prev-good`.

لفحص السبب على السيرفر (SSH قراءة):
```bash
pm2 status
pm2 logs arabya-web --lines 80
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000/mushaf/1 | head -5
```

## سوبر أدمن من البيئة فقط (H-05)

لا توجد عناوين بريد سوبر أدمن داخل الكود بعد هذا الإصلاح.

في `/var/www/arabya-web/.env` يجب أن يوجد:
```bash
ARABYA_ADMIN_EMAILS=بريدك@gmail.com,بريد-ثاني@gmail.com
```
بدونها لا يُعامل أحد كسوبر أدمن (fail-closed). أعد تشغيل PM2 بعد التعديل:
```bash
pm2 restart arabya-web --update-env
```

## robots / Cloudflare (H-02)

المصدر المعتمد: `src/app/robots.ts`. إن كان Cloudflare يفرض robots مختلفًا، عطّل Managed robots.txt أو اجعله يطابق المصدر.

## CSP (H-03)

ثيم الصفحة يُحمَّل من `/theme-boot.js` — أُزيل `unsafe-inline` من `script-src`. `style-src` ما زال يحتاج `unsafe-inline` لـ Tailwind/Next.

## الاعتماديات (H-01)

- استُبدل `xlsx` (SheetJS) بـ `exceljs` + محلل CSV داخلي.
- ملفات `.xls` القديمة غير مدعومة — استخدم `.xlsx` أو CSV.

## مطلوب منك الآن (مرة واحدة بعد الدمج)

1. تأكد أن `.env` على Contabo يحتوي `ARABYA_ADMIN_EMAILS` ببريدك.
2. انشر:
```bash
cd /var/www/arabya-web
git fetch origin main && git pull --ff-only origin main
bash scripts/contabo-deploy.sh
```
3. في Cloudflare: راجع robots override إن وُجد.
4. غيّر كلمة مرور حساب SFTP الذي استُخدم في التدقيق، وأنشئ حساب قراءة فقط على `/var/www/arabya-web` إن أمكن.
