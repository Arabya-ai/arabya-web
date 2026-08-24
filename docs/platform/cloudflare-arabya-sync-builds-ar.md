# إصلاح إشارة Workers Builds الحمراء (`arabya-sync`)

**الإنتاج الحقيقي = Contabo** (`arabya.org` + SQLite).  
Worker `arabya-sync` على Cloudflare مسار مزامنة **قديم/اختياري** — فشله **لا يوقف** الموقع إن كانت `ARABYA_USER_SYNC_ENABLED=1` على Contabo.

---

## السبب الرئيسي (من سجلات Cloudflare الفعلية — 24 أغسطس 2026)

| ما يحدث | الدليل |
|--------|--------|
| البناء الفاشل يشغّل `npm ci` على **جذر المستودع** (`arabya-web` / Next.js) | السجل يطلب حزم `@next/swc-*` و`lightningcss-*` و`@sentry/cli-*` — وهي **ليست** تبعيات الـ Worker |
| البناء الناجح يشغّل `npm ci` داخل `workers/arabya-sync` فقط | السجل: `added 39 packages` ثم `npx wrangler deploy` ينجح |
| حقل **Root directory** إن فُقد أو لم يُحفظ بعد تعديل Build command | يعود Cloudflare لتثبيت حزم الموقع الكامل فيفشل |

خطأ السجل النموذجي:

```text
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
npm error Missing: @next/swc-darwin-arm64@... from lock file
Failed: error occurred while installing tools or dependencies
```

هذا **ليس** بسبب وجود/غياب `npm run build` في حد ذاته.  
الـ Worker يحتاج فقط: تثبيت wrangler داخل `workers/arabya-sync` ثم `wrangler deploy`.

ملاحظة عن الفروع:

- على `main` → Deploy = `npx wrangler deploy` (إنتاج Worker)
- على فروع أخرى → Deploy الافتراضي = `npx wrangler versions upload` (معاينة) — **يجب أن يبقى Root directory = `workers/arabya-sync` أيضاً**

آخر نجاح معروف على `main`: دمج PR #212 (`2bf6f5d`) — Build command **فارغ** + Root = worker + `npx wrangler deploy`.

---

## الإعداد الصحيح في Cloudflare (انسخه حرفياً)

1. https://dash.cloudflare.com → **Workers & Pages** → **`arabya-sync`**
2. **Settings** → **Builds**
3. اضبط ثم **Save** (مهم: احفظ قبل أي Retry):

| الحقل | القيمة الصحيحة | تجنّب |
|--------|----------------|--------|
| **Root directory** | `workers/arabya-sync` | فارغ / جذر المستودع / مسار خاطئ |
| **Build command** | *(اتركه فارغاً)* | `npm run build` غير ضروري هنا |
| **Deploy command** | `npx wrangler deploy` | لا تستبدله يدوياً بـ `versions upload` على الإنتاج |
| **Production branch** | `main` | — |
| **Build watch paths** (إن وُجد) | `workers/arabya-sync/**` | بدونها كل push للموقع يشغّل بناء Worker بلا داعٍ |

4. اختياري ومستحسن: عطّل بناء فروع غير الإنتاج (**Non-production branch builds**) حتى لا تظهر إشارة حمراء على كل PR.
5. **Retry** لآخر بناء على `main` فقط بعد الحفظ.

Secret مطلوب للتشغيل: **`ARABYA_ADMIN_EMAILS`** في Variables/Secrets للـ Worker.

---

## إن لم تعد تحتاج Worker أصلاً

Contabo يغطي مزامنة الحسابات. يمكنك:

1. نفس الصفحة → **Builds** → **Disconnect repository** / تعطيل البناء التلقائي  
2. الإشارة الحمراء تختفي من GitHub  

لا يؤثر ذلك على `https://www.arabya.org`.

---

## ماذا تراقب بعد الإصلاح؟

| الفحص | المعنى |
|--------|--------|
| **CI** + **Deploy Contabo** | المهم للمنتج |
| **Workers Builds: arabya-sync** | اختياري — يُصلَح بالجدول أعلاه أو يُعطَّل |
| الموقع | https://www.arabya.org |

---

*مرجع تقني: `workers/arabya-sync/wrangler.toml` · Contabo: `ARABYA_USER_SYNC_ENABLED`*
