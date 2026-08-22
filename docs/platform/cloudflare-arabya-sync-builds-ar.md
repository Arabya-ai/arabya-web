# إصلاح إشارة Workers Builds الحمراء (`arabya-sync`)

**الإنتاج الحقيقي = Contabo** (`arabya.org` + SQLite).  
Worker `arabya-sync` على Cloudflare مسار مزامنة **قديم/اختياري** — فشله **لا يوقف** الموقع إن كانت `ARABYA_USER_SYNC_ENABLED=1` على Contabo.

---

## لماذا الإشارة حمراء؟

| السبب | التفسير |
|--------|---------|
| **Root directory** فارغ أو جذر المستودع | Wrangler يرى مشروع **Next.js** وليس Worker |
| **Build command** = `npm run build` بدون سكربت | خطأ: `Missing script: "build"` — أُصلح بإضافة السكربت في الكود |
| المسار الصحيح | **Root directory** = `workers/arabya-sync` |

---

## مطلوب منك الآن

### أ) إعداد Cloudflare (إن لم يُضبَط)

1. https://dash.cloudflare.com → **Workers & Pages** → **`arabya-sync`**
2. **Settings** → **Builds**
3. اضبط:

| الحقل | القيمة |
|--------|--------|
| **Root directory** | `workers/arabya-sync` |
| **Build command** | `npm run build` *(أو اتركه فارغاً)* |
| **Deploy command** | `npx wrangler deploy` |
| **Production branch** | `main` |

4. **Save**

### ب) بعد دمج إصلاح سكربت `build`

1. انتظر Deploy Contabo / أو ادفع Retry في Cloudflare  
2. راقب البناء حتى **نجاح** ثم Deploying  

*(حل فوري بدون انتظار كود: امسح Build command واتركه فارغاً → Retry)*

7. تأكد: Secret **`ARABYA_ADMIN_EMAILS`** في Variables/Secrets للـ Worker.

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
