# إنشاء حسابات ومفاتيح AI لمشروع عربية / لغوي

اكتب هذا الدليل للمالك غير التقني. نفّذ **مزودًا واحدًا في كل مرة**، ثم أرسل المفاتيح للوكيل أو الصقها على Contabo كما في الأسفل.

الهدف: عدة حسابات لكل مزود → مجمّع Auto يختار المفتاح الصحي تلقائيًا حسب التوكن المتبقي والفشل.

---

## الترتيب الموصى به (تكلفة/سهولة)

1. **Google AI Studio (Gemini)** — مجاني نسبيًا وسهل  
2. **OpenRouter** — مفتاح واحد يصل لنماذج كثيرة  
3. **OpenAI**  
4. **Anthropic (Claude)**  
5. **Ollama محلي على Contabo** — مجاني بعد التثبيت (ملاذ أخير)

Groq اختياري إن قبل حسابك.

---

## أ) Google AI Studio — خطوة بخطوة

1. افتح من المتصفح: https://aistudio.google.com/apikey  
2. سجّل الدخول بـ **جيميل رقم 1**.  
3. اضغط **Create API key**.  
4. اختر مشروع Google Cloud إن طُلب، أو أنشئ مشروعًا باسم مثل `arabya-lughawi-1`.  
5. انسخ المفتاح (يبدأ غالبًا بـ `AIza…`) إلى مفكرة على جهازك فقط — **لا تنشره في شات عام**.  
6. كرّر الخطوات 1–5 بـ **جيميل رقم 2، 3، …** (كل حساب = مفتاح).  
7. اجمع المفاتيح في سطر واحد مفصول بفواصل:

```text
AIza_مفتاح1,AIza_مفتاح2,AIza_مفتاح3
```

---

## ب) OpenRouter

1. افتح: https://openrouter.ai/  
2. Sign up (يمكن بـ Google).  
3. من القائمة: **Keys** → **Create Key**.  
4. سمِّه `arabya-1` وانسخه (`sk-or-…`).  
5. (اختياري) أضف رصيدًا صغيرًا من Billing إن أردت نماذج مدفوعة.  
6. كرّر بحسابات أخرى إن رغبت.

---

## ج) OpenAI

1. افتح: https://platform.openai.com/api-keys  
2. سجّل / سجّل الدخول.  
3. **Create new secret key** → انسخ `sk-…` فورًا (يظهر مرة واحدة).  
4. من **Billing** أضف وسيلة دفع إن طُلب (الحسابات الجديدة غالبًا تحتاج رصيد).  
5. كرّر بحسابات إضافية بحذر (سياسة OpenAI تمنع إساءة تعدد الحسابات — استخدم بحسابات شرعية فقط).

---

## د) Anthropic (Claude)

1. افتح: https://console.anthropic.com/  
2. سجّل الدخول.  
3. **API Keys** → **Create Key** → انسخ `sk-ant-…`.  
4. راجع الحدود من Plans & Billing.

---

## هـ) حقن كل المفاتيح على Contabo (PuTTY)

بعد جمع المفاتيح:

```bash
cd /var/www/arabya-web
nano .env
```

الصق (مثال):

```bash
LUGHAWI_MONTHLY_QUOTA_CHARS=15000
LUGHAWI_GOOGLE_API_KEYS=AIza_1,AIza_2,AIza_3
LUGHAWI_OPENROUTER_API_KEYS=sk-or-1,sk-or-2
LUGHAWI_OPENAI_API_KEYS=sk-1,sk-2
LUGHAWI_ANTHROPIC_API_KEYS=sk-ant-1,sk-ant-2
LUGHAWI_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
LUGHAWI_OLLAMA_MODEL=llama3.2
```

أو ملف أنظف لكثرة المفاتيح:

```bash
sudo mkdir -p /var/lib/arabya
sudo nano /var/lib/arabya/lughawi-ai-pool.json
```

استخدم القالب: `specs/001-lughawi-proofreader/lughawi-ai-pool.example.json`  
ثم في `.env`:

```bash
LUGHAWI_PROJECT_AI_POOL_FILE=/var/lib/arabya/lughawi-ai-pool.json
```

احفظ، ثم:

```bash
pm2 restart arabya-web --update-env
```

تحقق:

```bash
curl -s http://127.0.0.1:3000/api/lughawi/status | head
```

يجب أن يظهر `projectPoolCount` أكبر من 0.

---

## و) كيف يختار النظام المفتاح أوتوماتيك؟

```text
1) مفاتيح الزائر/المستخدم (BYOK) إن وُجدت
2) مجمّع المشروع مرتّب حسب:
   - التوكن المتبقي التقديري هذا الشهر
   - تقليل المفاتيح التي فشلت كثيرًا
   - توزيع Round-robin بين المتكافئين
3) Ollama المحلي إن ضُبط
```

ملف متابعة الاستخدام (على السيرفر):

`/var/lib/arabya/lughawi-ai-usage.json`

لوحة المالك: `/admin/ops` — تنبيهات نفاد التوكن وفشل المفاتيح.

---

## ز) نموذج محلي مجاني (Ollama)

على Contabo:

```bash
cd /var/www/arabya-web
bash scripts/contabo-ollama-setup.sh
# أو يدويًا:
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
# لاحقًا نماذج عربية أفضل عند توفرها
```

ثم أضف `LUGHAWI_OLLAMA_BASE_URL` كما فوق.

---

## مطلوب منك الآن (خطوة واحدة فقط)

أرسل في الرسالة التالية **ثلاثة مفاتيح Google** من ثلاثة جيميلات (الصقها هنا في رسالة خاصة للوكيل، أو أخبره أنك لصقتها في `.env` بنفسك).  
لا ترسل كل المزودين دفعة واحدة إن شعرت بالضغط — نبدأ بـ Google فقط.
