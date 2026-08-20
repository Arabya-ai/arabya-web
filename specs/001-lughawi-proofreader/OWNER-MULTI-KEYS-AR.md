# مجمّع مفاتيح لغوي — حسابات متعددة + تبديل تلقائي + نموذج محلي

Groq قد لا يقبل حسابات جديدة. لا مشكلة: استخدم **Google / OpenRouter / OpenAI / Claude** بعدد حسابات كبير، مع **Ollama محلي** على Contabo كملاذ أخير لا يتوقف.

---

## 1) كيف يعمل Auto الآن؟

```text
مفاتيح المستخدم (BYOK) أولًا
        ↓ فشل؟
مجمّع مشروع عربية (عشرات المفاتيح من جيميلات/حسابات مختلفة)
  — تبديل Round-robin بين المفاتيح
  — عند فشل مفتاح يُجرَّب التالي تلقائيًا
        ↓ فشل الجميع؟
نموذج محلي على Contabo (Ollama) إن كان مضبوطًا
        ↓
رسالة واضحة + بقاء التدقيق الأوفلاين
```

---

## 2) إنشاء 10 مفاتيح Google (موصى به)

لكل جيميل من العشرة:

1. افتح نافذة خاصة / حساب مختلف: https://aistudio.google.com/apikey  
2. Create API key  
3. انسخ المفتاح (`AIza…`)  
4. اجمع العشرة في مفكرة (سطر لكل مفتاح)

ثم على Contabo (PuTTY):

```bash
cd /var/www/arabya-web
nano .env
```

أضف:

```bash
LUGHAWI_MONTHLY_QUOTA_CHARS=15000
LUGHAWI_GOOGLE_API_KEYS=AIza_مفتاح1,AIza_مفتاح2,AIza_مفتاح3,AIza_مفتاح4,AIza_مفتاح5,AIza_مفتاح6,AIza_مفتاح7,AIza_مفتاح8,AIza_مفتاح9,AIza_مفتاح10
```

احفظ ثم:

```bash
pm2 restart arabya-web --update-env
```

---

## 3) إضافة 10 OpenAI + 10 Claude بنفس الأسلوب

```bash
LUGHAWI_OPENAI_API_KEYS=sk-1,sk-2,sk-3,...
LUGHAWI_ANTHROPIC_API_KEYS=sk-ant-1,sk-ant-2,...
LUGHAWI_OPENROUTER_API_KEYS=sk-or-1,sk-or-2,...
# اختياري إن عاد Groq للعمل:
LUGHAWI_GROQ_API_KEYS=gsk_1,gsk_2,...
```

أو ملف واحد أنظف لـ 30–50 مفتاحًا:

```bash
nano /var/lib/arabya/lughawi-ai-pool.json
```

مثال:

```json
{
  "version": 1,
  "slots": [
    { "provider": "google", "apiKey": "AIza...", "label": "gmail-1" },
    { "provider": "google", "apiKey": "AIza...", "label": "gmail-2" },
    { "provider": "openai", "apiKey": "sk-...", "label": "oa-1" },
    { "provider": "anthropic", "apiKey": "sk-ant-...", "label": "claude-1" },
    {
      "provider": "ollama",
      "apiKey": "ollama",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "model": "llama3.2",
      "label": "contabo-local"
    }
  ]
}
```

ثم في `.env`:

```bash
LUGHAWI_PROJECT_AI_POOL_FILE=/var/lib/arabya/lughawi-ai-pool.json
```

```bash
pm2 restart arabya-web --update-env
```

---

## 4) نموذج مفتوح المصدر على Contabo (لا يتعطل العمل)

يشغّل نموذجًا مثل Llama محليًا (مشابه لفكرة ChatGPT لكن على سيرفرك):

```bash
bash /var/www/arabya-web/scripts/contabo-ollama-setup.sh
```

أو يدويًا:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
# أو نموذج عربي أفضل لاحقًا حسب الذاكرة
systemctl enable --now ollama
```

في `.env`:

```bash
LUGHAWI_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
LUGHAWI_OLLAMA_MODEL=llama3.2
LUGHAWI_OLLAMA_API_KEY=ollama
```

```bash
pm2 restart arabya-web --update-env
```

بهذا: إذا انتهت حصص Google/OpenAI/Claude، يكمّل **المحلي** تلقائيًا.

> ملاحظة: النماذج المحلية تحتاج RAM كافية (يفضّل 8GB+ لنماذج صغيرة). الجودة أقل من Claude/GPT لكن الاستمرارية مضمونة.

---

## 5) مفتاح كل مستخدم (BYOK)

1. المستخدم يسجّل دخول Google في عربية.  
2. `/lughawi` → **الإعدادات**.  
3. يختار المزود ويلصق مفتاحه → حفظ.  
4. Auto يجرّب مفتاحه أولًا، ثم مجمّع المشروع، ثم المحلي.

---

## 6) تحقق

بعد إعادة التشغيل، من الإعدادات يجب أن ترى مثلًا:

`مجمّع مشروع عربية جاهز: 20 مفتاحًا (google×10 · openai×10)`  
وإن وُجد Ollama: إشارة للمحلي.

أو:

```bash
curl -s http://127.0.0.1:3000/api/lughawi/status | head -c 800
```

---

## 7) ترتيب مقترح عملي لك الآن

1. ابدأ بـ **10 مفاتيح Google** (الأسهل مجانًا).  
2. أضف **OpenRouter** إن أمكن (عدة نماذج ببوابة واحدة).  
3. أضف OpenAI/Claude عندما تجهز الحسابات المدفوعة.  
4. ثبّت **Ollama** على Contabo كملاذ أخير.  
5. لا تعتمد على Groq إن كان التسجيل معطلًا.
