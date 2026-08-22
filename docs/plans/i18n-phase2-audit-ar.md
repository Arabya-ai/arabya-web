# تدقيق i18n — المرحلة 2 (تقرير + خطة إكمال)

**تاريخ:** 22 أغسطس 2026  
**الخطة الأم:** [`project-audit-and-roadmap.md`](./project-audit-and-roadmap.md) — المرحلة 2  
**التفاصيل التقنية:** [`i18n-and-mobile.md`](./i18n-and-mobile.md)

---

## 1) الملخص التنفيذي

| المؤشر | القيمة | الحكم |
|--------|--------|--------|
| لغات الواجهة المفعّلة | `ar` · `en` | ✅ أساس جاهز |
| مفاتيح `messages/ar.json` | **1779** | ✅ |
| مفاتيح `messages/en.json` | **1779** | ✅ تطابق كامل |
| namespaces | **59** | ✅ متطابقة ar/en |
| صفحات `page.tsx` تحت `[locale]` | **79** | — |
| صفحات تستخدم `getTranslations` | **64** (81%) | 🟡 جيد |
| صفحات إعادة توجيه فقط (لا UI) | **8** | ✅ مقبول |
| صفحات استوديو بدون i18n في الصفحة | **7** | 🔴 فجوة رئيسية |
| مكوّنات client بعربي مضمّن (بدون `useTranslations`) | **~12** | 🟡 يحتاج موجات |

**الخلاصة:** البنية (next-intl + ar/en + parity) **قوية**. الفجوة الأكبر: **استوديو الفيديو (`src/ayat-studio/`)** و**لوحات `/admin/ops`** — نصوص عربية مضمّنة رغم وجود namespace `Studio` في JSON.

---

## 2) ثلاثة أنواع «لغة» (لا تخلط)

| النوع | مثال | الحالة |
|--------|------|--------|
| **لغة الواجهة (UI locale)** | أزرار، قوائم، عناوين صفحات | 🟡 ar/en جزئي — هذا التقرير |
| **لغة معنى الكلمة** | ar/en/id/ur في لوحة الدراسة | ✅ منفصلة (`MeaningLangSwitch`) |
| **طبعة ترجمة الآية** | Saheeh، Diyanet، … | ✅ منفصلة عن UI |

---

## 3) تدقيق الصفحات (79 مسار)

### 3.1 ✅ صفحات i18n كاملة (64)

تستخدم `getTranslations` في metadata والمحتوى، منها:

- الرئيسية، المصحف `[page]`، hubs (hadith، heritage، asma، books، …)
- لغوي، أذكار، qibla، tahfeez، search، services
- حساب، أدمن (CRM)، about/privacy/terms/contact
- create (صورة/فيديو)، library، favorites، pricing

### 3.2 ✅ إعادة توجيه فقط — لا تحتاج i18n (8)

| المسار | السبب |
|--------|--------|
| `mushaf/page.tsx` | → `/mushaf/1` |
| `surah/[id]/page.tsx` | → أول صفحة السورة |
| `nlp/page.tsx` | → `/lughawi` |
| `adhkar/qibla/page.tsx` | → `/qibla` |
| `admin/tahfeez/page.tsx` | → `/admin/users` |
| `studio/queue/page.tsx` | → مسار موحّد |
| `studio/sources/page.tsx` | → مسار موحّد |
| `[...rest]/page.tsx` | 404 |

### 3.3 🔴 فجوة: استوديو Ayat (7 صفحات)

| المسار | المشكلة |
|--------|---------|
| `studio/(ayat)/page.tsx` | metadata عربي ثابت + `<Landing />` |
| `studio/.../dashboard` | metadata عربي |
| `studio/.../editor/[id]` | metadata عربي |
| `studio/.../exports` | metadata عربي |
| `studio/.../projects` | metadata عربي |
| `studio/.../projects/new` | metadata عربي |
| `studio/.../settings` | metadata عربي |

**ملاحظة:** namespace `Studio` موجود في `messages/` (**~40+ مفتاح**) لكن **غير موصول** بـ `src/ayat-studio/`.

**تقدير:** ~13 ملف TSX في `ayat-studio` يحتوي نصوص عربية مضمّنة (toasts، أزرار، تبويبات).

---

## 4) تدقيق المكوّنات

### 4.1 ✅ مغطاة بـ `useTranslations` (أهم سطوح القرآن)

| المكوّن | namespace |
|---------|-----------|
| `MushafPageStudio` | Mushaf |
| `MushafToolbar` · `MushafPageNav` · `MushafStudySheets` | Mushaf |
| `StudyModeTabs` · `WordStudyDock` | Study · WordDock |
| `SiteChrome` · `PreferencesMenu` · `LocaleSwitcher` | Nav · Preferences · Locale |
| `AccountLanguagePanel` | Account · Locale |

### 4.2 🟡 عربي مضمّن — يحتاج موجة ترجمة

| المكوّن | الأولوية | ملاحظة |
|---------|----------|--------|
| **`src/ayat-studio/**`** | **P0** | أكبر فجوة en |
| `components/ops/AdminKeysManager.tsx` | P1 | أدمن فقط — ar كافٍ مؤقتاً |
| `components/ops/AdminOpsMonitor.tsx` | P1 |同上 |
| `components/ops/AdminSentryPanel.tsx` | P1 |同上 |
| `components/ops/AdminOpsTabs.tsx` | P1 |同上 |
| `components/library/Library*.tsx` (4 ملفات) | P1 | `/library` يظهر للزائر |
| `components/tahfeez/TahfeezApp.tsx` | P1 | `/tahfeez` عام |
| `components/dashboard/AdhkarContentManager.tsx` | P2 | محرر فقط |
| `components/dashboard/TahfeezHistoryActions.tsx` | P2 | محرر |
| `components/dashboard/AdminPrayerDefaultsPanel.tsx` | P2 | أدمن |
| `components/BrandLockup.tsx` | P2 | fallback بسيط ar/en inline — مقبول |

### 4.3 ⏸ لا تُترجم (قرار منتج)

- نص المصحف العثماني
- محتوى الإعراب/التفسير من `data/`
- رسائل API داخلية / اختبارات

---

## 5) تفضيلات اللغة — ما يعمل وما ينقص

| الآلية | الحالة |
|--------|--------|
| `LocaleSwitcher` + cookie `NEXT_LOCALE` | ✅ |
| `localStorage` (`arabya-ui-locale`) | ✅ |
| `AccountLanguagePanel` (حساب Google) | ✅ محلي |
| **مزامنة locale عبر `/api/sync`** | ❌ **غير منفّذ** — مهمة المرحلة 2-C |

---

## 6) خطة إكمال المرحلة 2 (موجات)

### الموجة 2-A — استوديو الفيديو (P0) — **الأولوية الأعلى داخل i18n**

**الهدف:** `/en/studio/...` يعرض واجهة إنجليزية كاملة.

1. [ ] ربط 7 صفحات studio بـ `getTranslations({ namespace: "Studio" })`
2. [ ] استبدال النصوص في `src/ayat-studio/` بـ `useTranslations("Studio")` (+ مفاتيح جديدة في JSON)
3. [ ] toasts وأزرار BackgroundPicker وLanding
4. [ ] اختبار: `/en/studio` + `/ar/studio` — metadata + UI

**معيار النجاح:** لا نص عربي ظاهر في `/en/studio/*` (عدا المحتوى القرآني).

### الموجة 2-B — المكتبة + التسميع (P1)

1. [ ] `LibraryHubClient` + بطاقات/أزرار → namespace `Library`
2. [ ] `TahfeezApp` → namespace `Tahfeez` (موجود جزئياً)
3. [ ] اختبار `/en/library` · `/en/tahfeez`

### الموجة 2-C — مزامنة تفضيل اللغة (P1)

1. [ ] إضافة `uiLocale` إلى payload `/api/sync`
2. [ ] قراءة عند login على جهاز جديد
3. [ ] توثيق في `AccountLanguagePanel`

**معيار النجاح:** تغيير اللغة على جهاز A يظهر على جهاز B بعد sync.

### الموجة 2-D — لوحات ops (P2 — أدمن)

1. [ ] `AdminKeysManager` · `AdminOpsMonitor` · `AdminSentryPanel`
2. [ ] namespace جديد `AdminOps` أو توسيع `Admin`
3. [ ] **ar أولاً** — en اختياري (جمهور أدمن عربي)

### الموجة 2-E — لغات إضافية (P3 — بعد استقرار ar/en)

1. [ ] `id` · `ur` · `tr` — ملفات `messages/*.json`
2. [ ] تحديث `i18n/config.ts` + `LocaleSwitcher`
3. [ ] **لا** ترجمة آلية لمصطلحات شرعية — مراجعة بشرية

---

## 7) Definition of Done (المرحلة 2)

- [ ] كل صفحة عامة (غير أدمن) تدعم `/en/...` بدون نص عربي مضمّن في UI
- [ ] استوديو + مكتبة + تسميع مغطّاة (2-A + 2-B)
- [ ] `uiLocale` يُزامَن سحابياً (2-C)
- [ ] `dir`/`lang` صحيحان — لا كسر RTL المصحف عند LTR
- [ ] `npm run test` + فحص يدوي `/en/mushaf/1` · `/en/studio`

---

## 8) أدوات إعادة التدقيق

```bash
# parity ar/en
node -e "const fs=require('fs');function k(o,p=''){return Object.entries(o).flatMap(([a,v])=>typeof v==='object'?k(v,p?p+'.'+a:a):[p?p+'.'+a:a])};const a=new Set(k(JSON.parse(fs.readFileSync('messages/ar.json'))));const e=new Set(k(JSON.parse(fs.readFileSync('messages/en.json'))));console.log('ar',a.size,'en',e.size,'diff', [...a].filter(x=>!e.has(x)).length);"

# صفحات بدون getTranslations
find src/app/\[locale\] -name page.tsx | while read f; do grep -q getTranslations "$f" || echo "$f"; done
```

---

*يُحدَّث هذا الملف بعد كل موجة i18n. آخر تدقيق: 22 Aug 2026 (R4).*
