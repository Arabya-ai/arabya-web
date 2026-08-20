# لغوي — المخطط الهندسي الشامل + برومبت Cursor الرئيسي

**الدور**: Chief Solutions Architect لمشروع لغوي داخل منصة عربية  
**الجمهور**: المالك (غير تقني) + وكيل Cursor المنفّذ  
**التاريخ**: 2026-08-20  
**القاعدة الذهبية**: لا نبني موقعًا جديدًا من الصفر على Vercel. نطوّر **لغوي** داخل المستودع الحالي `arabya-web` على سيرفر Contabo الخاص.

---

## 0) تصحيح قرارات الخطط السابقة (مهم جدًا)

الخطط التي وُلّدت سابقًا فيها أخطاء استراتيجية. الوكيل المنفّذ **ملزم** بما يلي:

| قرار خاطئ في الخطط القديمة | القرار الصحيح لمشروع عربية |
|-----------------------------|------------------------------|
| مشروع جديد `my-qalam-alternative` | التوسعة داخل `arabya-web` فقط |
| نشر Vercel / Netlify / Serverless | Contabo VPS + PM2 + Nginx فقط |
| Shadcn بنفسجي SaaS عام | هوية عربية: تيل `--brand` / RTL / لا نسخ شعار قلم أو صحح لي |
| حصة بالأحرف فقط أو 1500 حرف/يوم | **1500 كلمة/شهر** على مفاتيح المدير ثم BYOK |
| مفاتيح عبر `.env` فقط | واجهة سوبر أدمن `/admin/ops` لإضافة آلاف المفاتيح مشفّرة |
| اعتماد LLM فقط | هجين: قواعد محلية + sidecar (CAMeL/CATT/GEC/ARETA) + Auto LLM + Ollama |
| TipTap إلزامي فورًا | يجوز لاحقًا؛ لا تكسر `LughawiStudio` الحالي في المرحلة الأولى |

---

## 1) الرؤية والمنتج

**لغوي** = أكبر مساعد كتابة وتدقيق عربي فصيح في الوطن العربي، ركيزة تقنية داخل **عربية** (arabya.org)، وليس منتجًا منفصل الهوية.

### ينافس ويختلف عن
- **قلم**: واجهة 3 أعمدة، ألوان أخطاء، مستندات، ترجمة، اقتباسات، أسلوب، معجم، نماذج، تشكيل، تدقيق آيات، إعادة صياغة.
- **صحح لي**: صحّح الآن، مساعد قرآني، تفقيط، ترجمة، OCR، إحصائيات حصة، اشتراكات.

### يتميز عربية / لغوي
1. حماية النص القرآني وربطه بالمصحف والدراسة.  
2. محرك قواعد أوفلاين + تعلّم من قبول/رفض الجمهور.  
3. Auto متعدد المفاتيح + نماذج محلية لتقليل التكلفة.  
4. سجل أدوات مفتوحة (CAMeL, GEC, ARETA, CATT, BAYAN…) عبر sidecar.  
5. مراقبة سوبر أدمن للمفاتيح والاستخدام وصحة النظام.

---

## 2) الطبقات الأربع (Architecture)

```text
[1] واجهة RTL — /lughawi + وحدات (قلم∪صحح لي) بهوية عربية
        │
[2] بوابة Next (Route Handlers) — حصة كلمات · تشفير مفاتيح · Rate limit · أمان
        │
[3أ] محرك محلي Node — قواعد إملاء/نحو/أسلوب/ترقيم · تفقيط · حماية قرآن · تعلّم
[3ب] Sidecar Python — CAMeL · ARETA · CATT · HF GEC (على Contabo، ليس داخل حزمة Next)
[3ج] AI Auto Gateway — Gemini / OpenRouter / OpenAI / Anthropic / Groq / Ollama
        │
[4] تخزين Contabo — مفاتيح مشفّرة · حصص · تعلّم · مراقبة (لا تخزين نصوص المستخدم افتراضيًا)
```

### توزيع المهام على النماذج (Zero/Low cost)
| المهمة | المفضّل | بديل |
|--------|---------|------|
| تدقيق فقرة قصيرة | قواعد محلية أولًا ثم Gemini Flash | OpenRouter |
| مستند طويل / تشكيل سياقي | Gemini (سياق كبير) | Ollama محلي |
| إعادة صياغة / نبرة | Llama عبر Groq أو OpenRouter | Gemini |
| صرف / GEC علمي | CAMeL + HF GEC على sidecar | — |
| تفقيط | محرك محلي TypeScript فقط | — |
| عند نفاد المفاتيح | Ollama على Contabo | رسالة واضحة + بقاء الأوفلاين |

---

## 3) مراحل البناء الست (للوكيل — بالترتيب)

### المرحلة 0 — فهم الواقع (إلزامية قبل أي كود)
- اقرأ: `AGENTS.md`, `specs/001-lughawi-proofreader/*`, `src/lib/lughawi/**`, `src/components/lughawi/**`, `/admin/ops`.
- لا تحذف مسارات موجودة. وسّعها.
- شغّل `npm run test` بعد كل دفعة منطقية.

### المرحلة 1 — واجهة المنافسة (UX Parity)
- هيكل 3 أعمدة (وحدات يمين · محرر · فلاتر أخطاء يسار).
- ألوان: إملاء أحمر · نحو أزرق · أسلوب كهرماني · صرف/معجم بنفسجي · ترقيم رمادي.
- وحدات: صحّح الآن، مساعد قرآني، تفقيط، ترجمة، OCR، مستندات، ملحقات، اقتباسات، أسلوب، معجم، نماذج، إعدادات.
- أوضاع تدقيق: إملائي فقط / إملائي+نحوي.
- عداد كلمات/أحرف + شارة عدد الأخطاء + تصحيح الكل.
- لا تبنِ Landing بنفسجي؛ ابقَ داخل هوية عربية.

### المرحلة 2 — AI Gateway المؤسسي
- الإبقاء على `runAiAuto` + ترتيب حسب التوكن المتبقي.
- تغذية المفاتيح من: (1) واجهة أدمن مشفّرة (2) مفاتيح المستخدم BYOK (3) Ollama.
- حصة: 1500 كلمة/شهر على مفاتيح المشروع للمشترك المجاني؛ بعدها فرض BYOK برسالة عربية واضحة.
- لا تطلب من المالك تعديل `.env` لإضافة مفاتيح يوميًا — الواجهة أولًا.

### المرحلة 3 — تعميق المحرك المحلي
- توسيع قواعد الإملاء/النحو/الترقيم الشائعة في الصحافة العربية.
- تفقيط متقدم: تذكير/تأنيث وتمييز العدد والمعدود قدر الإمكان.
- درجة بلاغة/جودة نص (Eloquence Score) من إشارات قابلة للقياس (تكرار، مسافات، ترقيم، كثافة أخطاء).
- قاموس «لا تصحّح» مؤسسي.

### المرحلة 4 — Sidecar Python على Contabo
- خدمة مستقلة `services/lughawi-sidecar` على `127.0.0.1:8091`.
- ترتيب التثبيت: CAMeL Tools → ARETA → CATT → نماذج GEC HF.
- Next يستدعيها عبر `LUGHAWI_SIDECAR_URL`؛ لا تستورد بايثون في Turbopack.
- `/admin/ops` يعرض صحة الـ sidecar يوميًا.

### المرحلة 5 — المستندات والكثافة
- رفع TXT/DOCX/PDF (حد معقول عبر Nginx `client_max_body_size`).
- تقسيم Chunking + معالجة متوازية حذرة + إعادة تجميع.
- OCR (واجهة موجودة → محرك لاحقًا).
- تصدير PDF/DOCX.
- (لاحقًا) إضافة متصفح.

### المرحلة 6 — استقرار الإنتاج Contabo
- `next start` أو standalone تحت PM2 باسم موجود (`arabya-web`).
- عدم كسر `scripts/contabo-deploy.sh`.
- Rate limiting، عدم تسريب مفاتيح، عدم تخزين نصوص المستخدم افتراضيًا.
- اختبارات Vitest + عيّنة ذهبية عربية.

---

## 4) هيكل الملفات (الحقيقي — لا تستبدله)

```text
arabya-web/
├── src/app/[locale]/lughawi/          # واجهة لغوي
├── src/app/[locale]/admin/ops/         # مراقبة + مفاتيح الأدمن
├── src/app/api/lughawi/               # proofread, rewrite, translate, tashkeel, tafqeet, …
├── src/app/api/admin/lughawi-keys/    # CRUD مفاتيح مشفّرة
├── src/components/lughawi/            # LughawiStudio, Settings
├── src/lib/lughawi/                   # engine, rules, ai-gateway, quota, admin-pool
├── src/lib/ops/                       # integrations registry, usage meter, snapshot
├── services/lughawi-sidecar/          # Python NLP (توسعة)
├── data/ops/integrations-registry.json
├── data/lughawi/
└── specs/001-lughawi-proofreader/
```

---

## 5) ميزات المنتج الكاملة (Backlog للتفوق)

### أ — أساسي منافس
تدقيق إملاء/نحو/أسلوب/ترقيم · قبول/رفض · تشكيل متعدد الأوضاع · إزالة تشكيل · تفقيط · ترجمة · إعادة صياغة بنبرات · تدقيق آيات · مساعد قرآني · إحصائيات.

### ب — تماثل قلم/صحح لي
مستندات · قوالب · معجم شخصي/مصطلحات · ضبط أسلوب · كاشف اقتباسات · OCR · ملحقات · لوحة إحصائيات مستخدم · اشتراكات (بعد ثبات المحرك).

### ج — تفوق عربية
حماية وحي · ربط كلمة المصحف · تعلّم جماعي · سجل أدوات مفتوحة · نماذج محلية · مراقبة مفاتيح على مستوى الموقع · درجة بلاغة · معجم جذور/مترادفات من بيانات عربية.

### د — لاحقًا
لهجة→فصحى · صوت→نص→تدقيق · تدقيق SRT · إضافة متصفح · SDK.

---

## 6) معايير الجودة والأمان

1. الأمان قبل الواجهة: تشفير مفاتيح، لا أسرار في Git، rate limits، أدوار admin.  
2. كل طبقة تحليل لها مصدر واضح داخليًا (لا شرائح «المصدر» في الـ dock حسب قرار المنتج للمصحف؛ لغوي يوضح شرح القاعدة للمستخدم).  
3. عدم هلوسة قواعد: القواعد المحلية لها أولوية على اقتراحات LLM عند التعارض الواضح.  
4. اختبارات قبل الدمج: `npm run test` · مسارات `/lughawi` و`/api/lughawi/*`.  
5. المالك ليس مبرمجًا: أي إعداد متكرر = واجهة عربية بأزرار، لا أوامر PuTTY إلا للنشر العام.

---

## 7) البرومبت الجاهز للنسخ إلى Cursor Composer

انسخ الصندوق التالي بالكامل إلى وكيل Cursor الجديد:

```text
You are the IMPLEMENTER agent for Arabya’s product “لغوي / Lughawi”.
I (the owner) am NOT a programmer. Another agent is the Chief Architect.
You write production code. You do NOT ask me to edit .env for daily key management.
You do NOT create a new greenfield repo. You do NOT deploy to Vercel.

## HARD CONSTRAINTS
1. Work ONLY inside the existing repository `arabya-web` (Next.js 15 App Router, React 19, TypeScript, Tailwind 4, npm).
2. Production host is Contabo VPS (PM2 + Nginx). Ignore Vercel. Prefer extending `scripts/contabo-deploy.sh` if needed.
3. Brand: Arabya teal CSS variables (`--brand`, `--brand-deep`, `--brand-soft`, `--surface`, `--ink`). RTL Arabic. No purple SaaS look. Do not copy Qalam/Sahehly logos or exact copy.
4. Guest mushaf/reading must keep working without login. Lughawi AI features may require login/quota/BYOK.
5. Never add `workers/arabya-sync` file dependency on the monorepo root. Never run `next build` while `next dev` shares `.next`.
6. Do not put Python NLP inside the Next client bundle. Use `services/lughawi-sidecar` on localhost.
7. Security first: encrypt API keys at rest; never return raw keys to the browser; rate-limit admin/AI routes.
8. Free tier: project/admin keys serve free users for **1500 words/month**; then require user BYOK with a clear Arabic message.
9. Super-admin manages hundreds/thousands of keys via `/admin/ops` UI (already scaffolded) — improve it; do not force PuTTY/.env workflows for keys.
10. Follow AGENTS.md and specs under `specs/001-lughawi-proofreader/` (STATUS-AR, QALAM-PARITY-AR, SAHEHLY-PARITY-AR, CLOUD-VISION, integrations registry).

## CURRENT STATE (do not regress)
- Engine `lughawi-engine` multi-stage offline rules + Quran guard + learning feedback.
- `/lughawi` studio with Qalam-like shell + Sahehly modules scaffolding.
- AI Auto gateway with multi-provider pool, token-health ordering, Ollama fallback.
- Admin encrypted key pool + usage reports at `/admin/ops`.
- Registry: CAMeL Tools, Arabic GEC, text-editing, ARETA, BAYAN, CATT, Farasa(research), Ollama.

## YOUR MISSION (priority order)
### P0 — Stability & admin UX
- Harden `/admin/ops` key manager: bulk paste, enable/disable, delete, usage alerts, top users.
- Ensure quota is word-based (1500) end-to-end in APIs and UI strings.
- Keep Contabo deploy path working.

### P1 — Competitive editor UX
- Complete parity checklist vs Qalam + Sahehly UIs (side rails, filters, fix-all, verse tools, tashkeel strip, stats).
- Improve highlight accuracy and suggestion UX without breaking existing edit apply/reject learning.
- Optional later: TipTap upgrade ONLY if it clearly beats current editor without a rewrite cliff — prefer incremental.

### P2 — Hybrid NLP depth
- Expand local rules (spelling/grammar/punctuation/style) with high-precision Arabic MSA patterns.
- Advanced tafqeet (gender/count agreement where feasible).
- Wire Python sidecar health + first real endpoints: morph (CAMeL), tashkeel (CATT), optional GEC.
- Update `data/ops/integrations-registry.json` and admin monitor when tools go live.

### P3 — Documents & bulk
- Upload TXT/DOCX/PDF with safe size limits; chunking; merge results.
- OCR UI → pipeline stub then real engine.
- Export clean text / DOCX / PDF.

### P4 — Differentiation
- Eloquence/quality score; institutional don’t-correct dictionary; synonym/root peek using Arabya data where available.
- Plagiarism/style/templates modules as progressive enhancement (honest “soon” until real).

## AI ORCHESTRATION RULES
- Local rules run first on proofread.
- LLM used for rewrite/translate/deep tashkeel/long docs via Auto:
  user BYOK → admin encrypted pool (health-sorted) → Ollama.
- Providers: Google Gemini, OpenRouter, OpenAI, Anthropic, Groq(optional), Ollama.
- Structured JSON contracts already exist in `src/lib/lughawi/types.ts` — extend, don’t invent a conflicting parallel schema unless migrating carefully with tests.

## ENGINEERING PRACTICE
- Small commits; descriptive messages; branch naming if creating new: `cursor/<desc>-51a7`.
- After meaningful changes: `npm run test`; verify `/lughawi` and key APIs locally.
- Explain to the owner in plain Arabic: what changed for the visitor, and ONE next click-path for the owner (no dump of shell unless deploy).
- Prefer UI for any repeated owner action.

## START NOW
1. Read the files listed above.
2. Produce a short gap analysis vs Qalam+Sahehly+STATUS backlog.
3. Implement the highest-ROI P0/P1 items that are not already done.
4. Do not stop at architecture prose — ship working code in this repo.
```

---

## 8) ماذا يفعل المالك بعد لصق البرومبت؟

1. افتح محادثة Cursor Agent/Composer جديدة في مستودع `arabya-web` (ليس مجلدًا فارغًا).  
2. الصق برومبت القسم 7 كما هو.  
3. بعد أن يبني الوكيل دفعة: ادمج على GitHub → انشر Contabo بالأمر المعتاد.  
4. من السوبر أدمن → **مراقبة النظام** → أضف مفاتيح Google من الواجهة.  
5. افتح `/lughawi` وجرّب التصحيح.

---

## 9) قرار المهندس الأول (الآن)

- **لا** نبدأ مشروعًا موازيًا.  
- **نعم** نوسّع لغوي داخل عربية على Contabo.  
- **نعم** الهجين (قواعد + sidecar + Auto + Ollama) هو طريق «أكبر مشروع».  
- **الدفع/PayPal** بعد ثبات المحرك والواجهة.  
- الخطوة التالية للوكيل المنفّذ: فجوة P0/P1 ثم كود — لا إعادة كتابة من الصفر.
