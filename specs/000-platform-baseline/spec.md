# Feature Specification: منصة عربية كاملة (محلي + Contabo)

**Feature Branch**: `cursor/spec-kit`

**Created**: 2026-08-14

**Status**: Baseline (المنتج قائم — هذه المواصفة مرجع للتطوير اللاحق)

**Input**: تهيئة Spec Kit للموقع كاملًا على فرع مستقل، مع بيئتي localhost و Contabo، ثم النشر إلى GitHub دون دمج قسري في مسارات الإنتاج حتى اختبار المالك.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - قراءة المصحف ودراسة الكلمة (Priority: P1)

زائر عربي يفتح المصحف، ينتقل بين الصفحات، يسمع التلاوة، ويضغط كلمة ليرى إعرابًا ومعجمًا وترجمة وتفسيرًا.

**Why this priority**: هذا هو المنتج الأساسي.

**Independent Test**: `http://localhost:3000/mushaf/1` و `https://www.arabya.org/mushaf/1` يعرضان الصفحة الأولى مع كلمات قابلة للدراسة وتلاوة.

**Acceptance Scenarios**:

1. **Given** زائر على المحلية أو Contabo، **When** يفتح `/mushaf/1`، **Then** تظهر صفحة مصحف المدينة مع كلمات وإعراب دون كسر RTL.
2. **Given** كلمة محددة، **When** يفتح لوحة الدراسة، **Then** تظهر الطبقات الأربع: إعراب، معجم، ترجمة، تفسير.
3. **Given** اتصال شبكة، **When** يشغّل التلاوة، **Then** يعمل الصوت دون كسر تفضيلات المصحف.

---

### User Story 2 - حساب Google والمزامنة (Priority: P1)

مستخدم يسجّل الدخول بـ Google ويجد تفضيلاته وملاحظاته على الجهاز الآخر.

**Why this priority**: الحسابات تعمل على Contabo عبر SQLite وليست على Vercel.

**Independent Test**: تسجيل دخول على localhost (OAuth dev) وعلى `www.arabya.org` / `www.arabyaai.com`.

**Acceptance Scenarios**:

1. **Given** Google OAuth مضبوط، **When** يسجّل الدخول على أي نطاق إنتاج، **Then** تكتمل الجلسة دون `invalid_client`.
2. **Given** `ARABYA_USER_SYNC_ENABLED=1` على Contabo، **When** يحفظ مفضلة وهو مسجّل، **Then** تُحفظ في SQLite على السيرفر.
3. **Given** النطاق الآخر (`arabyaai.com`)، **When** يفتح الموقع، **Then** يرى نفس التطبيق على Contabo.

---

### User Story 3 - الاستوديو ولوحة المالك (Priority: P2)

المالك يضبط المظهر، يدير المستخدمين، ويستخدم الاستوديو لإنشاء آيات.

**Why this priority**: أدوات التشغيل اليومي بعد استقرار المصحف.

**Independent Test**: مسارات `/studio` ولوحة الحساب على المحلي و Contabo بعد صلاحية أدمن.

**Acceptance Scenarios**:

1. **Given** حساب سوبر أدمن، **When** يغيّر كريديت الفوتر، **Then** يُحفظ على Contabo (SQLite) ويظهر للزوار بعد التحديث.
2. **Given** مطوّر محلي، **When** يشغّل `npm run dev`، **Then** يصل لنفس الشاشات بدون نشر.

---

### User Story 4 - تطوير بمواصفات قبل الكود (Priority: P1)

المالك يطلب ميزة جديدة في Cursor عبر `/speckit-specify` ثم خطة ثم مهام ثم تنفيذ على فرع، ثم اختبار محلي، ثم دمج ونشر Contabo.

**Why this priority**: سبب إدخال Spec Kit.

**Independent Test**: أوامر `/speckit-*` ظاهرة في Cursor داخل هذا المشروع؛ الملفات في `.specify/` و`specs/` و`.cursor/skills/speckit-*`.

**Acceptance Scenarios**:

1. **Given** المشروع مفتوح في Cursor على فرع `cursor/spec-kit`، **When** يكتب المطوّر `/speckit-specify`، **Then** تُنشأ مواصفة تحت `specs/`.
2. **Given** مواصفة مكتملة، **When** يُنفَّذ العمل، **Then** لا يُنشر إلى Contabo إلا بعد اختبار محلي ودمج في `main`.
3. **Given** الزائر، **When** يتصفح الموقع، **Then** لا يرى ملفات Spec Kit؛ هي في Git فقط.

---

### Edge Cases

- فشل Google OAuth على نطاق واحد دون الآخر (يجب أن تُدرج كل Origins).
- PM2 متوقف بعد إعادة تشغيل VPS — يُعاد عبر ecosystem Contabo.
- بيانات `/data` ناقصة محليًا بعد clone جديد — تُبنى بسكربتات `npm run`.
- دفع أو أحاديث كاملة: خارج النطاق حتى مواصفة لاحقة.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: النظام MUST يقدّم المصحف والدراسة والبحث على المحلي وعلى Contabo بنفس السلوك الظاهر.
- **FR-002**: الإنتاج MUST يعمل على Contabo (PM2 + Nginx) للنطاقين `www.arabya.org` و `www.arabyaai.com`.
- **FR-003**: المحتوى القرآني MUST يبقى Git-first تحت `/data`.
- **FR-004**: حسابات المستخدم MUST تُخزَّن في SQLite على Contabo عند تفعيل المزامنة؛ D1 أرشيف فقط.
- **FR-005**: الأسرار MUST لا تُرفع إلى Git (`.env*` مستثنى).
- **FR-006**: أي ميزة جديدة MUST تُوصف في Spec Kit قبل التنفيذ ما لم تكن إصلاحًا عاجلًا موثَّقًا.
- **FR-007**: النشر إلى Contabo MUST يتم بعد دمج `main` عبر `scripts/contabo-deploy.sh` ما لم يطلب المالك خلاف ذلك.
- **FR-008**: واجهة RTL والعربية MUST تبقى صحيحة في البيئتين.

### Key Entities

- **صفحة مصحف**: رقم 1–604، كلمات، تلاوة، تفضيلات عرض.
- **حساب مستخدم**: Google identity، أدوار (زائر / أدمن / سوبر أدمن)، مفضّلات سحابية.
- **بيئة تشغيل**: local dev مقابل Contabo production (نفس الكود، أسرار مختلفة).
- **مواصفة Spec Kit**: مجلد تحت `specs/` يصف تغييرًا قبل الكود.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: مسارات الدخان (`/`, `/mushaf/1`, تسجيل الدخول) تنجح على localhost وعلى `www.arabya.org`.
- **SC-002**: `www.arabyaai.com` يخدم نفس التطبيق على Contabo.
- **SC-003**: مطوّر يفتح المشروع في Cursor ويرى مهارات `speckit-*` دون تثبيت إضافي بعد سحب الفرع.
- **SC-004**: لا تُسرَّب ملفات `.env` أو مفاتيح OAuth في الـ PR.

## Assumptions

- الإنتاج الحالي على Contabo قائم (ServerAvatar / PM2)؛ هذه المواصفة لا تعيد بناء السيرفر.
- فرع `cursor/spec-kit` مستقل عن تعديلات `main` المحلية غير الملتزمة (CSS/صوت/QA).
- المالك يختبر الفرع ثم يقرر الدمج في `main` والنشر إلى Contabo.
- LicensesWP مشروع منفصل له دستور ومواصفات خاصة.
