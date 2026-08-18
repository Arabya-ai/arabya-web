# Arabya Web

موقع **عربية** — منصة تحليل كلمات القرآن الكريم (RTL) على Next.js: مصحف المدينة، إعراب، معجم، ترجمة، وتفاسير متعددة.

## التقنية

- **Next.js 15 + TypeScript + Tailwind 4**
- **البيانات:** ملفات JSON داخل `/data` (Git-first)
- **النشر (الإنتاج):** Contabo VPS + ServerAvatar — [`docs/platform/hosting-contabo-ar.md`](docs/platform/hosting-contabo-ar.md) · OAuth والتحديث: [`docs/platform/contabo-google-and-updates-ar.md`](docs/platform/contabo-google-and-updates-ar.md)  
- **حسابات Google + المزامنة:** SQLite على السيرفر — [`docs/platform/accounts-owner-guide-ar.md`](docs/platform/accounts-owner-guide-ar.md)  
- **Analytics:** Cloudflare Web Analytics (token في `.env.production.local`)  
- **legacy:** Render / D1 — أرشيف فقط؛ راجع `docs/platform/d1-accounts.md`
- **Spec Kit (تطوير في Cursor):** دستور `.specify/memory/constitution.md` · مواصفات `specs/` · أوامر `/speckit-specify` و`/speckit-plan` و`/speckit-implement` — لا تظهر للزائر على Contabo

## سياسة البيانات (Git-first)

| نوع البيانات | أين تُخزَّن | ملاحظات |
|--------------|-------------|---------|
| نص القرآن، الكلمات، الإعراب، التفاسير | `/data` على GitHub | مجاني دائمًا، نسخة مع كل commit |
| مفضّلات / آخر صفحة / الوضع الليلي | `localStorage` في المتصفح | بلا سيرفر |
| مفضّلات / ملاحظات / عادة القراءة (مع حساب) | SQLite على Contabo | `ARABYA_USER_SYNC_ENABLED=1` |
| حسابات (legacy) | Cloudflare D1 / Worker | أرشيف — `docs/platform/d1-accounts.md` |
| صوت / ملفات كبيرة (لاحقًا) | CDN أو R2 | التلاوة الحالية من EveryAyah |

**لا نعتمد** Google Sheets أو Supabase كقاعدة للمحتوى القرآني.

تفاصيل المواصفات: [`docs/spec/`](docs/spec/).

## مصادر البيانات (مفتوحة)

| المصدر | الاستخدام |
|--------|-----------|
| Quran.com API | نص QPC Hafs، WBW (EN/ID/UR)، ترجمات الآيات، التفاسير |
| [Quranic Arabic Corpus](http://corpus.quran.com) | إعراب/صرف لكل كلمة (GPL — مع ذكر المصدر) |
| EveryAyah | تلاوة الآية |

معنى عربي كلمة بكلمة: **معجم مواد عربية** (`lemma-sense-ar.json`) — معاني دلالية قصيرة مرتبطة بمواد Quranic Arabic Corpus، مع احتياطي صرفي. التلاوة كلمة بكلمة من Quran CDN. دراسة سريعة: `/api/study` يُرجع ملخصًا محليًا (معنى + صرف + الميسّر).

## التشغيل محليًا

```bash
npm install
npm run fetch-data           # كلمات السور (QPC Hafs + EN WBW)
npm run apply-qpc-text       # إعادة تطبيق ترميز QPC إن لزم
npm run build-mushaf-index   # فهرس صفحات المصحف (604)
npm run build-irab           # إعراب منظم + فهرس الجذور
npm run build-meaning-ar     # معجم مواد + معنى عربي للكلمات
npm run fetch-tafsirs        # تحميل التفاسير العربية
npm run fetch-translations   # WBW ID/UR + ترجمات الآيات
npm run build-search-index   # فهرس بحث الآيات
npm run validate-data        # تحقق سلامة البيانات
npm run test                 # Vitest
npm run dev
```

## المسارات

- `/` — فهرس السور + بحث آيات/جذور + مفضّلات + دراسة سريعة
- `/mushaf/[page]` — مصحف المدينة (1–604) مع دراسة الكلمات
- `/surah/[id]/read` — قراءة السورة كاملة + روابط إعراب/دراسة
- `/ayah/[surah]/[verse]` — إعراب الآية كلمة بكلمة
- `/juz` — فهرس الأجزاء الثلاثين
- `/root/[root]` — مواضع جذر صرفي
- `/books` — كتب الإعراب (مرخّصة عند التوفر)
- `/resources` · `/qiraat` — موارد وإذاعة / القراءات (حفص حاليًا)
- `/hadith` · `/heritage` — محاور لاحقة (placeholders)
- `/studio` — استوديو الآيات (تلاوة + تصدير في المتصفح)
- `/studio/ai` — فيديو ذكي من موضوع (MoneyPrinterTurbo كخدمة شقيقة؛ يحتاج محرك Python)
- `/about` · `/privacy`

## واجهة الدراسة

**الطبقات الظاهرة في لوحة الكلمة** (بالترتيب):

1. **إعراب** — سرد نحوي من وسوم QAC (افتراضي)
2. **معجم** — صرف + جذر/مادة + روابط `/root`
3. **ترجمة** — دلالة الكلمة (عربي/EN/ID/UR) + ترجمة الآية
4. **تفسير** — السعدي / الميسر / ابن كثير / القرطبي / البغوي

**مؤجّل** (انظر `docs/DEVELOPMENT.md`): بلاغة · Claims متعددة المصادر · كتب إعراب مرخّصة.

أيضاً في المصحف: جدول كلمات/إعراب للصفحة، قرّاء EveryAyah، تلاوة كلمة بكلمة، تكبير خط، مشاركة، مفضّلات، وضع ليلي، OG.

## ربط النطاق (الاستضافة)

- **Contabo (مدفوع رخيص وثابت):** [`docs/platform/hosting-contabo-ar.md`](docs/platform/hosting-contabo-ar.md)
- **Render (مجاني مؤقت):** [`docs/platform/hosting-free-render-ar.md`](docs/platform/hosting-free-render-ar.md)

بعد ربط المستودع أو السيرفر، كل `git push` إلى `main` يمكن أن يعيد النشر حسب إعدادك (ServerAvatar / webhook).

## QA سريع بعد النشر

- `/` — فهرس + بحث بلا تشكيل (مثل «الحمد») + جذر (مثل «رحم»)
- `/mushaf/1` و `/mushaf/2` — كلمات، إعراب، تفسير، تلاوة؛ حجم الصفحة خفيف
- من اللوحة: روابط «إعراب الآية» و«الجذر»
- `/root/رحم` — صفحة جذر
- مشاركة آية · مفضّلة · الوضع الليلي

## خارطة الطريق

| المرحلة | الحالة |
|---------|--------|
| 0 — إطلاق + Git-first | مكتمل |
| 1 — لوحة كلمة + صرف منظم + معنى عربي | مكتمل |
| 1ب — OG + ليلي + CI + تحقق بيانات | مكتمل |
| 2 — Canonical IDs + جذور | مكتمل |
| 3 — صوت (EveryAyah) | مكتمل للتلاوة |
| 3ب — حسابات D1 | مواصفات — `docs/platform/d1-accounts.md` |
| 3ج — دراسة سريعة (استرجاع محلي) | مكتمل — `/api/study` |
| 3د — معجم مواد عربي دلالي | مكتمل — `lemma-sense-ar.json` |
| أمن أساسي + بحث جذر من الفهرس | مكتمل |
| A — طبقات ظاهرة (4) + Claims/بلاغة لاحقاً | جارٍ (4 حية · بلاغة/Claims مؤجّلة) |
| B — بوابة شاملة | جارٍ |
| C — كتب إعراب مرخّصة | جاهزية البنية |
| D — روايات / تجويد / D1 / RAG-LLM | تدريجي |
| E — أحاديث ثم تراث + Knowledge Universe | مؤجّل — `docs/knowledge-universe/` |

### رؤية طويلة الأمد

عربية = **منصة تحليل نص عربي كلمة بكلمة**: قرآن (الآن) → أحاديث → شعر/تراث من المكتبة الشاملة ومصادر أخرى. كل طبقة لها مصدر واضح. جلب البيانات عبر APIs أو ملفات أو استيراد/سكرابينج حسب توجيه المالك.
