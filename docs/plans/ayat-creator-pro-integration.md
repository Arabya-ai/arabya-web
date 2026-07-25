# فحص ayat-creator-pro وخطة الدمج في عربية

تاريخ الفحص: 2026-07-26  
آخر تحديث تنفيذ: 2026-07-26  
المستودع المرجعي: https://github.com/mohamedtaghayen/ayat-creator-pro  
الحالة: **منفَّذ جزئيًا في عربية** — مسارات `/create` و`/pricing` + أساس `UserPlan`؛ بوابة **PayPal لاحقًا**.

---

## ما دُمج في عربية

| المصدر | ماذا أُخذ |
|--------|-----------|
| ayat-creator-pro | محرك WebCodecs + `mp4-muxer` + visualizer → `src/lib/media-export/` |
| rukn / PNG exporters | فكرة خلفية + ترجمة + موضع نص → محرر PNG بـ resvg |
| quran-image-creator / Siraj / QuranImage | مرجع UX للمقاسات الاجتماعية (1:1، 9:16، 16:9) |
| Ayat-Embed | مرجع تضمين لاحقًا (غير منفَّذ كـ iframe بعد) |

**لم يُدمَج:** قالب Vite/Lovable، shadcn، alquran.cloud، مفاتيح `.env`.

نص الآيات من QPC المحلي؛ الصوت من EveryAyah عبر [`src/lib/audio.ts`](../../src/lib/audio.ts).

### مسارات المنتج

- `/create` — مركز الإنشاء  
- `/create/image` — PNG (مجاني بعلامة؛ بلس بدون علامة + مقاسات/خلفية)  
- `/create/video` — MP4 (بلس فقط)  
- `/pricing` — خطط + تنويه PayPal القادم  
- حراسة تسجيل دخول عبر middleware على `/create`

### الاشتراك (قبل PayPal)

- `UserPlan`: `free` | `plus` في [`src/lib/plans.ts`](../../src/lib/plans.ts) + `session.user.plan`
- منح بلس: بريدات المالك المضمّنة (`egywebdev@gmail.com`, `arabyaaicom@gmail.com`) أو `ARABYA_PLUS_EMAILS` أو دور editor/admin
- الدفع لاحقًا: **PayPal** (Webhook يحدّث الخطة) — انظر `platform-expansion-and-subscriptions.md`

---

## مشاريع دراسة كلمة (مرجع — لا كسر للمصحف)

| المشروع | الاستخدام في عربية |
|---------|-------------------|
| Quranic Arabic Corpus | مستخدم أصلًا في الصرف/الإعراب (GPL + attribution في About) |
| mustafa0x/quran-morphology | مرجع بيانات صرف — لا استبدال لملفاتنا الحالية في هذه الدفعة |
| NoorBayan / Open Hikmah / Jawhar / tafsir-mcp / quran-mcp / irab-web | مراجع UX/بيانات لاحقة؛ **لم تُستورد مكتباتها** كي لا تُخرَّب نواة الدراسة |

---

## اختبار يدوي مقترح

1. ضيف يفتح `/create/image` → يُحوَّل لتسجيل الدخول  
2. حساب مجاني: PNG مربع بعلامة؛ فيديو يظهر CTA ترقية  
3. حساب بلس (أو أدمن): مقاسات + فيديو على Chrome  
4. `/mushaf/1` ونقر كلمة وبحث وتبديل لغة — بلا تغيير سلوكي
