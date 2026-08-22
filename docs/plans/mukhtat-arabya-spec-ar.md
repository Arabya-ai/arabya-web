# مخطط عربية — مواصفات تقنية (ملحق الخطة الرئيسية)

**الاسم المعتمد:** مخطط عربية  
**المسار المقترح:** `/mukhtat`  
**الخطة الأم (مصدر الحقيقة):** [`project-audit-and-roadmap.md`](./project-audit-and-roadmap.md) — §7  

**تاريخ:** 2026-08-22  
**مرجع خارجي:** [mindfrond.com](https://mindfrond.com/) · [MindFrond-1.13.3-source.zip](https://mindfrond.com/downloads/MindFrond-1.13.3-source.zip) (Freeplane + AI plugin, GPL v2+)

---

## 1) ماذا نبني؟

| الطبقة | MindFrond | مخطط عربية |
|--------|-----------|-------------|
| Marketing | HTML ثابت | Next.js `/mukhtat` — teal RTL |
| المحرك | Java/Swing Desktop | **محرر ويب** (React) |
| الملفات | `.mm` XML | **import/export `.mm`** + JSON داخلي |
| AI | LangChain4j plugin | مرحلة D — Auto/لغوي Contabo |
| الحفظ | قرص محلي | ضيف + Google → SQLite |

**لا نهدف:** تشغيل Freeplane JVM على Contabo في المراحل الأولى.

---

## 2) مصفوفة الخصائص

| خاصية | أولوية | مرحلة | حالة |
|--------|--------|-------|------|
| Landing (hero, features, compare, FAQ) | P0 | 5-A | ⏳ قادم |
| محرر: Enter/Insert/F2، drag، fold | P0 | 5-B | ⏳ |
| Outline sync | P0 | 5-B | ⏳ |
| import/export `.mm` | P0 | 5-B | ⏳ |
| notes, attributes, tags | P1 | 5-C | ⏳ |
| styling (colors, icons, edges) | P1 | 5-C | ⏳ |
| search/filter | P1 | 5-C | ⏳ |
| presentation mode | P2 | 5-C | ⏳ |
| export PNG/SVG/OPML/PDF | P1 | 5-C | ⏳ |
| formulas `=6*7` | P2 | 5-C | ⏳ |
| conditional styles | P3 | 5-D+ | ⏳ |
| Groovy scripting | — | **لا للويب** | — |
| AI expand branch | P1 | 5-D | ⏳ |
| ربط `/mushaf` `/hadith` | P1 | 5-C | ⏳ |
| PWA offline | P3 | 5-E | ⏳ |
| 25+ UI languages | P2 | 5-A/B | 🟡 عبر next-intl |

---

## 3) معمارية (Contabo)

```text
/mukhtat                 → landing
/mukhtat/editor/[id]     → editor (client)
/api/mukhtat/...         → CRUD maps (SQLite user-data)
```

**Guest:** localStorage + export `.mm`  
**Member:** حفظ سحابي بعد Google login  

---

## 4) GPL

- لا ننسخ كود Java Freeplane إلى `arabya-web`.
- parser `.mm` + UI جديد = مسار آمن.
- صفحة `/mukhtat/about` لاحقاً: «متوافق مع تنسيق Freeplane/MindFrond Desktop».

---

## 5) قرارات مفتوحة (مالك)

| # | السؤال | الافتراض |
|---|--------|----------|
| 1 | مسار URL `/mukhtat`؟ | مقترح — يُؤكَّد |
| 2 | login إلزامي للحفظ؟ | لا — ضيف OK في MVP |
| 3 | AI في MVP؟ | لا — مرحلة D |
| 4 | رابط تحميل MindFrond Desktop؟ | لا في 5-A |

---

## 6) تحقق كل مرحلة

| مرحلة | معيار النجاح |
|-------|--------------|
| 5-A | landing يطابق structurally mindfrond.com؛ RTL mobile OK |
| 5-B | خريطة → save → reopen → export `.mm` يفتح في Desktop |
| 5-C | styling + export PNG + link node → mushaf |
| 5-D | «وسّع الفرع» يعمل بدون كسر لغوي |

---

*أي تغيير في النطاق يُحدَّث أولاً في `project-audit-and-roadmap.md`.*
