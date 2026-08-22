# دليل المالك — حسابات عربية على Contabo (Google + SQLite)

هذا الدليل مكتوب لك خطوة بخطوة. لا تحتاج معرفة برمجة.

## أين نحن؟ (آخر تحديث)

| المرحلة | الحالة |
|---------|--------|
| **A — الاستضافة** | Contabo + ServerAvatar + `www.arabya.org` |
| **B — Google OAuth** | مفعّل |
| **C — مزامنة الحساب** | SQLite على السيرفر (`/var/lib/arabya/`) |
| **D — لوحة المدير** | `/admin` (تعمل عند تفعيل المزامنة) |
| **E — Analytics** | Cloudflare Web Analytics (اختياري — انظر الأسفل) |

**ما لم نعد نستخدمه:** Render · Cloudflare D1 للمزامنة (أرشيف).

---

## المرحلة A — Google (مرجع سريع)

### المتغيرات على السيرفر (`.env.production.local`)

```
AUTH_SECRET=...
AUTH_GOOGLE_ID=....apps.googleusercontent.com
AUTH_GOOGLE_SECRET=...
AUTH_URL=https://www.arabya.org
AUTH_TRUST_HOST=true
ARABYA_ADMIN_EMAILS=بريدك@gmail.com
```

### Google Cloud → OAuth

1. https://console.cloud.google.com/
2. **Authorized JavaScript origins:**
   - `https://www.arabya.org`
   - `https://arabya.org`
   - `http://localhost:3000` (للتجربة المحلية فقط)
3. **Authorized redirect URIs:**
   - `https://www.arabya.org/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`

بعد أي تعديل على `.env`:

```bash
cd /var/www/arabya-web
cp -f .env.production.local .env.local
pm2 restart arabya-web
```

---

## المرحلة B — مزامنة المفضّلة والملاحظات (SQLite)

### كيف يعمل؟

```
المتصفح → www.arabya.org (Contabo) → ملف SQLite على القرص
```

- **لا** Cloudflare D1
- **لا** Worker منفصل
- نص القرآن يبقى في Git (`/data`)

### التفعيل (مرة واحدة)

```bash
sudo mkdir -p /var/lib/arabya/backups
sudo chown "$(whoami):$(whoami)" /var/lib/arabya

cd /var/www/arabya-web
nano .env.production.local
```

أضف:

```
ARABYA_USER_SYNC_ENABLED=1
ARABYA_USER_DB_PATH=/var/lib/arabya/user-data.sqlite
```

ثم:

```bash
cp -f .env.production.local .env.local
bash scripts/contabo-deploy.sh
```

### اختبار

1. جهاز 1: سجّل دخول → احفظ مفضّلة → **مزامنة** من حسابي
2. جهاز 2: نفس الحساب → **مزامنة** → `/favorites`

### نسخ احتياطي يومي (موصى به)

```bash
sudo crontab -e
```

السطر:

```
0 3 * * * cp /var/lib/arabya/user-data.sqlite /var/lib/arabya/backups/user-data-$(date +\%F).sqlite
```

---

## المرحلة C — PM2 يبقى شغّالاً بعد إعادة التشغيل

```bash
pm2 startup
# نفّذ الأمر الذي يظهر
pm2 save
```

---

## المرحلة D — لوحة المدير (`/admin`)

### من يدخل؟

- **سوبر أدمن (admin)** — إمّا من `ARABYA_ADMIN_EMAILS` في `.env` على Contabo (bootstrap)، **أو** ترقية من CRM `/admin/users` → قائمة الدور → «سوبر أدمن» (يُحفظ في SQLite)
- **محرر (editor)** — صلاحيات محدودة (استوديو، مصادر) — **بدون** CRM

### ترقية سوبر أدمن من الواجهة (موصى به)

1. سجّل دخول كسوبر أدمن  
2. `/admin/users`  
3. عند العضو: قائمة الدور → **سوبر أدمن** → تأكيد  
4. العضو: **خروج ثم دخول** Google  
5. يظهر له CRM في القائمة

*(عناوين .env لا تُخفَّض من الواجهة — احذفها من الملف فقط إن لزم)*

### ماذا تفعل هناك؟

| الصفحة | الغرض |
|--------|--------|
| `/admin` | إحصائيات (مستخدمون، مفضّلات، نشاط) |
| `/admin/users` | بحث، ترقية، حظر |
| `/admin/requests` | طلبات «محرر» |
| `/admin/settings` | OAuth، المزامنة، مظهر الفوتر |

### إن ظهر «المزامنة غير مفعّلة»

تأكد على السيرفر:

```bash
grep ARABYA_USER_SYNC /var/www/arabya-web/.env.production.local
pm2 restart arabya-web
```

---

## المرحلة E — Cloudflare Web Analytics (زيارات مجمّعة)

DNS عندك على Cloudflare — يمكن تفعيل Analytics بدون كود إضافي من لوحة Cloudflare، **أو** عبر token في الموقع.

### الطريقة الموصى بها (token في الموقع)

1. Cloudflare → **Analytics & Logs** → **Web Analytics**
2. **Add a site** → `www.arabya.org`
3. انسخ **Beacon token** (سلسلة أحرف)
4. على السيرفر في `.env.production.local`:

```
NEXT_PUBLIC_CF_BEACON_TOKEN=التوكن_هنا
```

5. `bash scripts/contabo-deploy.sh`

> لا ترسل التوكن في الدردشة العامة — الصقه في السيرفر فقط.

---

## تحديث الموقع بعد أي تغيير في GitHub

```bash
cd /var/www/arabya-web
bash scripts/contabo-deploy.sh
```

---

## إغلاق المسارات القديمة (100% نقل)

- [ ] DNS: `www.arabya.org` و `www.arabyaai.com` → IP Contabo
- [ ] Render: لا توجد خدمة نشطة (إن وُجدت)
- [ ] DNS: كل السجلات → IP Contabo فقط
- [ ] Google OAuth: احذف روابط `arabyaai.com` / `onrender.com` إن لم تعد تحتاجها

---

## مراجع في المشروع

| الملف | المحتوى |
|-------|---------|
| `docs/platform/contabo-google-and-updates-ar.md` | OAuth + deploy + SQLite |
| `docs/platform/hosting-contabo-ar.md` | شراء السيرفر و ServerAvatar |
| `docs/platform/d1-accounts.md` | **legacy** — D1 (لم نعد نستخدمه) |

---

## ملاحظات

- القراءة في المصحف **بدون** تسجيل دخول.
- «الاشتراك» = حساب Gmail مجاني (ليس دفع PayPal بعد).
- لو تعثّرت: صِف الشاشة أو أرسل لقطة.
