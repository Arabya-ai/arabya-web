# إصلاح إشارة Workers Builds الحمراء (`arabya-sync`)

**الإنتاج الحقيقي = Contabo** (`arabya.org` + SQLite).  
Worker `arabya-sync` على Cloudflare مسار مزامنة **قديم/اختياري** — فشله **لا يوقف** الموقع إن كانت `ARABYA_USER_SYNC_ENABLED=1` على Contabo.

---

## لماذا الإشارة حمراء؟

Workers Builds يفشل غالباً خلال **أقل من ثانية** عندما:

| السبب | التفسير |
|--------|---------|
| **Root directory** فارغ أو جذر المستودع | Wrangler يرى مشروع **Next.js** وليس Worker |
| المسار الصحيح غير مضبوط | يجب أن يكون `workers/arabya-sync` حيث يوجد `wrangler.toml` |

الكود داخل `workers/arabya-sync` يبني محلياً (`npm ci` + `wrangler deploy --dry-run`) — المشكلة إعداد لوحة Cloudflare وليست Contabo.

---

## مطلوب منك الآن (مرة واحدة — ~5 دقائق)

1. افتح: https://dash.cloudflare.com  
2. **Workers & Pages** → Worker **`arabya-sync`**  
3. **Settings** → **Builds** (أو **Build**)  
4. اضبط:

| الحقل | القيمة |
|--------|--------|
| **Root directory** | `workers/arabya-sync` |
| **Build command** | اتركه فارغاً *(أو* `npm ci` *إن طلب النظام أمراً)* |
| **Deploy command** | `npx wrangler deploy` |
| **Production branch** | `main` |

5. **Save**  
6. **Retry** آخر بناء فاشل، أو ادفع commit فارغ — راقب حتى يصير أخضر  

7. تأكد أيضاً (مرة سابقة): Secret **`ARABYA_ADMIN_EMAILS`** موجود تحت Variables/Secrets للـ Worker (نفس بريدات Contabo إن استخدمت Worker).

---

## إن لم تعد تحتاج Worker أصلاً

 Contabo يغطي المزامنة. يمكنك:

1. نفس الصفحة → **Builds** → **Disconnect repository** / تعطيل البناء التلقائي  
2. الإشارة الحمراء تختفي من GitHub  

لا يؤثر ذلك على `https://www.arabya.org`.

---

## ماذا تراقب بعد الإصلاح؟

| الفحص | المعنى |
|--------|--------|
| **CI** + **Deploy Contabo** | المهم للمنتج |
| **Workers Builds: arabya-sync** | اختياري — يُصلَح بالجدول أعلاه أو يُعطَّل |
| الموقع | https://www.arabya.org/lughawi و `/admin` |

---

*مرجع تقني: `workers/arabya-sync/wrangler.toml` · Contabo: `ARABYA_USER_SYNC_ENABLED`*
