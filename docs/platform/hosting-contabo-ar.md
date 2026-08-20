# استضافة Contabo لـ عربية

الإنتاج يعمل على **Contabo VPS** (Node + PM2 + Nginx).  
النطاقان **`www.arabya.org`** و **`www.arabyaai.com`** يشيران إلى نفس التطبيق.

---

## التكلفة المتوقعة (تقريباً)

| البند | الشهري |
|--------|--------|
| Contabo Cloud VPS 10 (مستحسن للبداية) | حوالي **€4.5–7** (~$5–8) |
| منطقة أوروبا (EU) | بدون رسوم موقع إضافية عادة |
| ServerAvatar (اختياري) | مجاني محدود أو باقة مدفوعة |
| النطاقان `arabya.org` + `arabyaai.com` | عند مسجّلك (منفصل) |

---

## المسار الأسهل: ServerAvatar

### إنشاء تطبيق Node
1. **Create Application** → **Node.js**
2. Domains: `www.arabya.org` **و** `www.arabyaai.com`
3. GitHub: `Arabya-ai/arabya-web` فرع `main`
4. **Install:** `npm ci` · **Build:** `npm run build` · **Start:** `npm run start`
5. متغيرات البيئة:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
   - `AUTH_URL=https://www.arabya.org` (أو `.com` — نفس السيرفر)
   - `ARABYA_ADMIN_EMAILS`
6. SSL (Let's Encrypt) لكل النطاقات الأربعة: apex + www لكل domain

---

## DNS (النطاقان)

| السجل | القيمة |
|--------|--------|
| `A` `@` لـ arabya.org | IP السيرفر |
| `A` `www` لـ arabya.org | IP السيرفر |
| `A` `@` لـ arabyaai.com | IP السيرفر |
| `A` `www` لـ arabyaai.com | IP السيرفر |

**Google OAuth** — أضف كل Origins و Redirect URIs:
- `https://www.arabya.org` و `https://www.arabyaai.com`
- `…/api/auth/callback/google` لكل منهما

---

## Nginx (يدوي)

انظر `deploy/contabo/nginx-dual-domain.conf` — كلا النطاقين → `127.0.0.1:3000`.

---

## تحديث بعد كل دمج على main

```bash
cd /var/www/arabya-web && bash scripts/contabo-deploy.sh
```

- Google OAuth: `docs/platform/contabo-google-and-updates-ar.md`
- PM2: `deploy/contabo/ecosystem.config.cjs`
- Bootstrap أول مرة: `scripts/contabo-bootstrap.sh`
- قطع إشارة Vercel الحمراء على GitHub (مرة واحدةحدة): `docs/platform/disconnect-vercel-github-ar.md`
- إن ظهر `WebpackError is not a constructor` عند البناء: `docs/platform/contabo-webpackerror-fix-ar.md`
