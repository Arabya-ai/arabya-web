# خطة عربية الموحّدة: SaaS المعزول + مسار ورق + ما سبق

تاريخ التحديث: 24 أغسطس 2026  
الحالة: **المرحلة 1 (Docker) جاهزة للتحقق على Contabo — لا تبدأ المراحل 2–5 قبل نجاح التحقق.**

---

## 1) أين نقف الآن (ملخص للمالك)

| المسار | الحالة |
|--------|--------|
| Contabo إنتاج + PM2 + `arabya.org` | مستقر (لا يُلمس في حزمة SaaS) |
| جلد ورق / لوحة الألوان (PR #211–#213) | منشور على Contabo |
| لغوي L0–L5 | موجود؛ الجودة ما زالت ضعيفة نسبيًا (أولوية منتج منفصلة) |
| تحويل تطبيق ورق المكتبي → ويب (المسار 1: كل المعالجة على Contabo) | قرار استراتيجي مسجّل — تنفيذ لاحق |
| **4 منتجات SaaS معزولة (Umami / Chatwoot / Cal.com / Documenso)** | **المرحلة 1 فقط في هذا الفرع** |

---

## 2) القواعد الصلبة (لا تُكسر)

1. **المستودع Append-Only** لهذه الحزمة: ملفات جديدة + وثائق؛ لا إعادة هيكلة قلب المصحف/الدراسة.
2. **العزل:** شبكة Docker اسمها `arabya-saas-network` فقط.
3. **المنافذ (Host):**
   - Umami `13000`
   - Chatwoot `14000`
   - Cal.com `15000`
   - Documenso `16000`
4. **Next.js:** أي سكربت طرف ثالث لاحقًا عبر `use client` + `useEffect` أو `<Script strategy="lazyOnload">` أو `dynamic(..., { ssr: false })`.
5. **تدهور لطيف:** سقوط حاوية لا يجب أن يُسقط `arabya.org`.
6. **الإنتاج = Contabo فقط** (ليس Vercel).

---

## 3) ربط الخطط السابقة

| وثيقة / مسار | العلاقة |
|--------------|---------|
| `docs/plans/project-audit-and-roadmap.md` | خارطة المنتج العامة |
| `docs/plans/platform-expansion-and-subscriptions.md` | توسع المنصة والاشتراكات (مؤجّل الدفع) |
| `docs/plans/lughawi-model-plan-ar.md` | جودة لغوي (متوازي، غير محظور بهذه الخطة) |
| Warraq Path 1 (معالجة على Contabo) | منتج «الكاتب الذكي» لاحقًا؛ منفصل عن حاويات SaaS الأربع |
| PR #211–#213 | هوية بصرية ورق + لوحات ألوان — مكتمل ومنشور |
| Handoff PR #179–#209 | استقرار Contabo + لغوي + إصلاحات UI — مرجع تاريخي |

---

## 4) خارطة المراحل الخمس (SaaS المعزول)

### المرحلة 1 — بنية Docker بلا تعارض ✅ (هذا الفرع)

**الملفات:**

| ملف | الدور |
|-----|--------|
| `docker-compose.standalone-saas.yml` | Umami+PG، Chatwoot+PG+Redis+Web+Worker، Cal.com+PG، Documenso+PG |
| `.env.saas-templates` | أسرار ومنافذ جاهزة (انسخ إلى `.env.saas` على الخادم) |
| `scripts/saas-generate-documenso-cert.sh` | شهادة توقيع Documenso |
| `scripts/saas-standalone-up.sh` / `saas-standalone-down.sh` | تشغيل / إيقاف |

**بعد دمج/سحب الفرع على Contabo — تحقق المالك (PuTTY):**

```bash
cd /var/www/arabya-web
git fetch origin
git checkout cursor/saas-phase1-compose-f55f   # أو main بعد الدمج
cp .env.saas-templates .env.saas
chmod +x scripts/saas-*.sh
bash scripts/saas-standalone-up.sh
```

تحقق المنافذ:

```bash
curl -sI http://127.0.0.1:13000 | head -1
curl -sI http://127.0.0.1:14000 | head -1
curl -sI http://127.0.0.1:15000 | head -1
curl -sI http://127.0.0.1:16000 | head -1
docker compose -f docker-compose.standalone-saas.yml --env-file .env.saas ps
```

إن بقي Chatwoot غير صحي في الإقلاع الأول:

```bash
docker compose -f docker-compose.standalone-saas.yml --env-file .env.saas \
  exec chatwoot-web bundle exec rails db:chatwoot_prepare
```

**توقف هنا حتى يؤكد المالك نجاح التحقق.** لا تبدأ المرحلة 2 تلقائيًا.

---

### المرحلة 2 — ودجت Chatwoot (SSR-safe) ⏳

- `src/components/ChatwootWidget.tsx` (`"use client"` + `useEffect`)
- حقن كسول في `src/app/layout.tsx`
- يعتمد على `NEXT_PUBLIC_CHATWOOT_*` بعد إنشاء Inbox

### المرحلة 3 — متعقّب Umami ⏳

- `<Script strategy="lazyOnload" />` من `next/script`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` بعد إنشاء موقع في Umami

### المرحلة 4 — `/consultation` + Cal.com ⏳

- `src/app/consultation/page.tsx`
- iframe أو embed مع هيكل تحميل (skeleton)
- لا يلمس المصحف

### المرحلة 5 — Documenso certificates API ⏳

- `src/lib/services/documenso.ts`
- `triggerCertificateIssuance(email, name)` مع try/catch عازل

---

## 5) ترتيب المنتج الوظيفي المقترح (متوازي مع SaaS)

ليس ملزمًا؛ يُحدَّث بتوجيه المالك:

1. جودة لغوي حقيقية  
2. رفع صوت → تفريغ (STT على Contabo)  
3. تصدير Word/PDF  
4. محقّق / فهرسة (ورق Path 1)  
5. تكامل شهادات Documenso مع مسارات التعلم

---

## 6) ما لن يفعله هذا المسار

- لا يستبدل Nginx/PM2 لتطبيق Next.js الأساسي  
- لا يفتح منافذ قواعد البيانات على الإنترنت (Postgres/Redis داخل الشبكة فقط)  
- لا يفرض تسجيل دخول لقراءة المصحف  
- لا يعتمد على Hugging Face أو Vercel

---

## 7) نقطة التحقق الحالية

**المطلوب من المالك الآن:** تشغيل أوامر المرحلة 1 على Contabo وإرسال نتيجة `docker compose ... ps` + أكواد HTTP للمنافذ الأربعة. بعد التأكيد ننتقل للمرحلة 2 فقط.
