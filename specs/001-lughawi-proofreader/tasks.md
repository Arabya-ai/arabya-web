# Tasks: لغوي — المدقق اللغوي العربي الفصيح

**Input**: Design documents from `/specs/001-lughawi-proofreader/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Owner lock (2026-08-20)**: حصة **15,000** حرف/شهر · الاسم **لغوي** · واجهات مستلهمة من arabiccorrector.com + sahehly.com بهوية عربیا

**Tests**: Vitest للوحدات/العقود حيث يُذكر في المهام

**Organization**: حسب قصص المستخدم؛ المسار المحلي TypeScript أولًا (`src/lib/lughawi`) مع هيكل جاهز لـ `services/lughawi-engine` لاحقًا

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذه بالتوازي
- **[Story]**: US1…US7 من المواصفة

---

## Phase 1: Setup

**Purpose**: هيكل المجلدات والإعدادات المشتركة

- [x] T001 إنشاء هيكل `src/lib/lughawi/` و`src/components/lughawi/` و`src/app/[locale]/lughawi/` و`src/styles/lughawi.css` و`src/app/api/lughawi/` وفق `plan.md`
- [x] T002 [P] إضافة متغيرات البيئة الموثّقة في `.env.example` (`LUGHAWI_*` حصة 15000، مفتاح مشروع، رابط محرك)
- [x] T003 [P] تحديث قرارات المالك في `specs/001-lughawi-proofreader/{spec,plan,quickstart,research,contracts}.md` (تم جزئيًا — التحقق)

---

## Phase 2: Foundational (Blocking)

**Purpose**: أنواع مشتركة، قواعد، تطبيع، حماية قرآن خفيفة، عقد استجابة موحّد — قبل أي قصة مستخدم

- [x] T004 تعريف الأنواع المشتركة في `src/lib/lughawi/types.ts` (Edit, ProtectedSpan, ProofreadResponse, modes)
- [x] T005 [P] تطبيع عربي أساسي في `src/lib/lughawi/normalize.ts`
- [x] T006 [P] كشف مقاطع قرآنية محمية بسيط في `src/lib/lughawi/quran-guard.ts` (مطابقة من بيانات محلية خفيفة أو أنماط آيات قصيرة)
- [x] T007 دمج مراحل بلا تعارض في `src/lib/lughawi/pipeline.ts` (أولوية: حماية > قواعد > نحو > ترقيم > AI)
- [x] T008 قوالب ملاحظات القواعد في `src/lib/lughawi/rules/notes.ts` + فهرس أنواع الأخطاء
- [x] T009 إعدادات الحصة الافتراضية `LUGHAWI_MONTHLY_QUOTA_CHARS=15000` في `src/lib/lughawi/config.ts`
- [x] T010 اختبارات وحدة تأسيسية في `src/lib/lughawi/pipeline.test.ts`

**Checkpoint**: يمكن استدعاء `proofreadLocal(text)` وإرجاع edits بدون واجهة

---

## Phase 3: User Story 1 — تصحيح فوري مجاني (P1) 🎯 MVP

**Goal**: زائر يصحّح إملاءً شائعًا مع ملاحظات دون حساب

**Independent Test**: `/lughawi` + لصق «انا ذهبت الى المدرسه» → اقتراحات همزة/إلى/ة

- [x] T011 [P] [US1] قواعد إملاء في `src/lib/lughawi/rules/spelling.ts` (همزة أنا/إلى، تاء مربوطة شائعة، ألف فارقة مبسّطة، مسافات)
- [x] T012 [US1] ربط القواعد بالخط في `src/lib/lughawi/engines/spelling-engine.ts`
- [x] T013 [US1] مسار API `POST` في `src/app/api/lughawi/proofread/route.ts` وفق العقد
- [x] T014 [US1] مكوّن محرر مستلهم من arabiccorrector في `src/components/lughawi/LughawiStudio.tsx` (textarea، عدّاد أحرف، زر دقّق، نتيجة، تمييز تعديلات، tooltip شرح)
- [x] T015 [US1] صفحة `src/app/[locale]/lughawi/page.tsx` بهوية عربیا + استيراد `lughawi.css`
- [x] T016 [US1] أنماط عربیا (تيل، RTL، بدون أرجواني) في `src/styles/lughawi.css` مستلهمة من هيكل المنافسين
- [x] T017 [P] [US1] مفاتيح i18n `Lughawi` في `messages/ar.json` و`messages/en.json`
- [x] T018 [US1] اختبار `src/lib/lughawi/rules/spelling.test.ts` لعيّنات ذهبية ≥10

**Checkpoint**: MVP يعمل محليًا بدون مفتاح AI

---

## Phase 4: User Story 2 — نحو وشرح القاعدة (P1)

**Goal**: أخطاء نحوية شائعة + شرح قاعدة

**Independent Test**: جملة بخطأ توافق/إنّ → تصحيح + explanation

- [x] T019 [P] [US2] قواعد نحو أساسية في `src/lib/lughawi/rules/grammar.ts`
- [x] T020 [US2] دمج النحو في `pipeline.ts` وعرض نوع `grammar` في الواجهة
- [x] T021 [US2] تحسين بطاقة الملاحظة في `src/components/lughawi/EditTooltip.tsx`
- [x] T022 [US2] قبول/رفض تعديل فردي وتحديث النص الناتج في `LughawiStudio.tsx`
- [x] T023 [US2] اختبارات `src/lib/lughawi/rules/grammar.test.ts`

---

## Phase 5: User Story 3 — حصة 15k + BYOK (P1)

**Goal**: حصة مشروع مدقق العربية + مفاتيح المستخدم لعدة مزودين

**Independent Test**: واجهة إعدادات تعرض 15000؛ حفظ مفتاح (وضع تخزين آمن)؛ رفض AI عند النفاد بلا مفتاح

- [x] T024 [US3] تخزين حصص في الذاكرة/ملف محلي آمن أولًا مع واجهة جاهزة لـ SQLite في `src/lib/lughawi/quota-store.ts`
- [x] T025 [US3] تشفير/حفظ مفاتيح المزودين في `src/lib/lughawi/credentials-store.ts` (لا تُرجع المفتاح كاملًا)
- [x] T026 [P] [US3] `GET/PUT/DELETE` في `src/app/api/lughawi/quota/route.ts` و`providers/route.ts` و`providers/[id]/key/route.ts`
- [x] T027 [US3] بوابة AI موحّدة في `src/lib/lughawi/ai-gateway.ts` (openai, anthropic, google, groq, openrouter)
- [x] T028 [US3] لوحة إعدادات في `src/components/lughawi/LughawiSettings.tsx` + تبويب في الاستوديو
- [x] T029 [US3] فرض الحصة قبل مسارات rewrite/AI في الـ API

---

## Phase 6: User Story 4 — إعادة صياغة وتشكيل (P2)

**Goal**: أوضاع صياغة + تشكيل كامل/جزئي/أواخر/إلزامي مثل صححلي

**Independent Test**: أزرار تصحيح / إعادة صياغة / ترجمة / تشكيل تعمل؛ أوضاع التشكيل الأربعة

- [x] T030 [US4] واجهة أزرار الأوضاع مستنسخة من arabiccorrector في `LughawiStudio.tsx`
- [x] T031 [US4] `POST /api/lughawi/rewrite` و`/tashkeel` و`/translate` في `src/app/api/lughawi/`
- [x] T032 [US4] محرك تشكيل مبسّط/احتياطي في `src/lib/lughawi/engines/tashkeel-engine.ts` (+ مسار AI عند التوفر)
- [x] T033 [US4] قسم أوضاع التشكيل بأسلوب صححلي في الصفحة التسويقية/الاستوديو

---

## Phase 7: User Story 5 — حماية قرآن وربط عربیا (P2)

**Goal**: عدم تعديل الآيات؛ روابط مصحف/دراسة؛ تحليل كلمة اختياري

**Independent Test**: لصق آية معروفة → protectedSpans؛ رابط يعمل

- [x] T034 [US5] تقوية `quran-guard.ts` وعيّنات من `/data` خفيفة
- [x] T035 [US5] عرض المقاطع المحمية في الواجهة + روابط `/mushaf` أو `/ayah/...`
- [x] T036 [P] [US5] زر «تحليل كلمة» يفتح طبقة مبسطة أو يوجّه لـ `/study`

---

## Phase 8: User Story 6 — خدماتنا + صفحات مثل المنافسين (P2)

**Goal**: اكتشاف لغوي + صفحات هيكل المنافسين بهوية عربیا

**Independent Test**: خدماتنا → لغوي؛ صفحات الميزات/الأخطاء/الأسئلة تعمل

- [x] T037 [US6] إضافة رابط **لغوي** في `src/components/SiteChrome.tsx` + مفتاح `Nav.lughawi`
- [x] T038 [P] [US6] أقسام تسويقية في `/lughawi`: ماذا نقدّم، كيف يعمل، لمن، أخطاء شائعة، أسئلة شائعة (هيكل arabiccorrector)
- [x] T039 [P] [US6] صفحة `src/app/[locale]/lughawi/features/page.tsx` مستلهمة من ميزات صححلي (إملاء، نحو، أوضاع تشكيل)
- [x] T040 [P] [US6] صفحة `src/app/[locale]/lughawi/mistakes/page.tsx` للأخطاء الشائعة
- [x] T041 [US6] إدراج `/lughawi` في `src/app/sitemap.ts`
- [x] T042 [US6] بطاقة لغوي في صفحة اختيارية `src/app/[locale]/services/page.tsx` إن لزم لتجميع خدمات عربية

---

## Phase 9: User Story 7 — أدوات متقدمة (P3)

**Goal**: ترقيم، تفقيط، عقد داخلي مستقر

- [x] T043 [P] [US7] محرك ترقيم في `src/lib/lughawi/rules/punctuation.ts`
- [x] T044 [P] [US7] تفقيط أرقام في `src/lib/lughawi/engines/tafqeet.ts`
- [x] T045 [US7] زر تفقيط في الواجهة + مسار API عند الحاجة
- [x] T046 [US7] توثيق العقد النهائي في `specs/001-lughawi-proofreader/contracts/lughawi-api.md` ليطابق التنفيذ

---

## Phase 10: Polish

- [x] T047 [P] استيراد CSS في التخطيط العام إن لزم (`src/app/globals.css` أو layout)
- [x] T048 تشغيل `npm run test` لمسارات lughawi وإصلاح الانحدارات
- [x] T049 التحقق المحلي: `curl` لـ proofread + فتح `/lughawi` (HTTP 200)
- [x] T050 تحديث علامة المهام المكتملة في `tasks.md` بعد التنفيذ

---

## Dependencies & Execution Order

```text
Phase1 → Phase2 → US1(MVP) → US2 → US3 → US4 → US5 → US6 → US7 → Polish
```

- US1 لا يعتمد على AI
- US3 يحجب مسارات AI في US4 إن لم تُضبط الحصة/المفتاح
- US6 يمكن موازاته جزئيًا مع US4/US5 بعد جاهزية الصفحة الأساسية

### Parallel opportunities

- T005∥T006∥T008 بعد T004
- T014 واجهة ∥ T011 قواعد بعد T007
- T038∥T039∥T040 صفحات تسويق
- T043∥T044 أدوات P3

### MVP scope

**T001–T018 (Setup + Foundation + US1)** كافية لإطلاق تجريبي عام. ثم US2 ثم US3 قبل توسيع الصياغة/التشكيل المعتمد على AI.

### Independent tests (ملخص)

| Story | اختبار |
|-------|--------|
| US1 | proofread محلي + UI |
| US2 | grammar edit + tooltip + accept/reject |
| US3 | quota 15000 + provider key round-trip |
| US4 | rewrite/tashkeel/translate modes |
| US5 | protected quran span |
| US6 | nav + marketing pages |
| US7 | punctuation + tafqeet |
