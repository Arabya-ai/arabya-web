# خطوات المالك — كل مزودي الذكاء الاصطناعي للغوي

هدف الصفحة: تفعيل **الحصة المجانية 15000 حرف/شهر** و**وضع Auto** (تبديل تلقائي بين المزودين مثل Cursor).

> لا تضع المفاتيح في Git أبدًا. ضعها في `.env` على Contabo فقط.  
> الأفضل: ابدأ بـ **Groq + Google** (مجانًا غالبًا بدون بطاقة)، ثم أضف الباقي.

---

## أ) ماذا تحتاج؟

| النوع | لمن؟ | ماذا يفعل؟ |
|------|------|------------|
| مفاتيح **مشروع عربية** | أنت (المالك) | تمول الحصة المجانية + Auto للمسجّلين |
| مفتاح **المستخدم** | الزائر من `/lughawi` → الإعدادات | يتجاوز الحصة على حسابه وحده |

المزودون المدعومون في لغوي الآن: **Groq · Google Gemini · OpenRouter · OpenAI · Anthropic**

---

## ب) خطوات كل مزود بالتفصيل

### 1) Groq — الأسرع للبداية (موصى به أولًا)
1. افتح: https://console.groq.com  
2. سجّل بحساب Google أو GitHub  
3. من القائمة: **API Keys** → **Create API Key**  
4. سمِّه مثلًا `arabya-lughawi`  
5. انسخ المفتاح فورًا (يبدأ غالبًا بـ `gsk_`) — لن يظهر كاملًا لاحقًا  
6. مجاني بحدود سرعة؛ مناسب للحصة التجريبية

### 2) Google AI Studio (Gemini) — مجاني عادة بلا بطاقة
1. افتح: https://aistudio.google.com/apikey  
2. سجّل بحساب Google  
3. **Get API key** → **Create API key** (مشروع جديد أو موجود)  
4. انسخ المفتاح (يبدأ غالبًا بـ `AIza`)  
5. اختياري لاحقًا: ضع حد إنفاق في Google Cloud حتى لا تحدث مفاجآت

### 3) OpenRouter — بوابة واحدة لعدة نماذج
1. افتح: https://openrouter.ai  
2. سجّل بـ Google أو GitHub  
3. اذهب إلى: https://openrouter.ai/keys  
4. **Create Key** → انسخ المفتاح (`sk-or-…`)  
5. مجاني محدود عبر نماذج `:free`؛ يمكن شحن رصيد لاحقًا للتوسّع

### 4) OpenAI (اختياري · غالبًا يحتاج بطاقة)
1. افتح: https://platform.openai.com/api-keys  
2. سجّل / سجّل الدخول  
3. أضف وسيلة دفع إن طلب النظام ذلك  
4. **Create new secret key** → انسخ `sk-…`  
5. ضع حد إنفاق شهري من Billing (مثل 10$)

### 5) Anthropic Claude (اختياري)
1. افتح: https://console.anthropic.com  
2. سجّل حسابًا  
3. **API Keys** → **Create Key**  
4. انسخ المفتاح  
5. حسابات جديدة قد تحصل على رصيد تجريبي محدود

---

## ج) أين أضع مفاتيح المشروع على Contabo؟

1. PuTTY → `root@IP`  
2. نفّذ:

```bash
cd /var/www/arabya-web
nano .env
```

3. الصق (استبدل القيم الحقيقية):

```bash
LUGHAWI_MONTHLY_QUOTA_CHARS=15000

# خيار أسهل — مجمّع Auto واحد (مفصول بـ | )
LUGHAWI_PROJECT_AI_POOL=groq:gsk_XXX|google:AIzaXXX|openrouter:sk-or-XXX|openai:sk-XXX|anthropic:sk-ant-XXX

# أو مفاتيح منفصلة بدل السطر أعلاه:
# LUGHAWI_GROQ_API_KEY=gsk_...
# LUGHAWI_GOOGLE_API_KEY=AIza...
# LUGHAWI_OPENROUTER_API_KEY=sk-or-...
# LUGHAWI_OPENAI_API_KEY=sk-...
# LUGHAWI_ANTHROPIC_API_KEY=sk-ant-...
```

4. احفظ: `Ctrl+O` ثم Enter ثم `Ctrl+X`  
5. أعد التشغيل:

```bash
pm2 restart arabya-web --update-env
```

أو أعد النشر الكامل:

```bash
cd /var/www/arabya-web && bash scripts/contabo-deploy.sh
```

---

## د) مفتاح المستخدم من الواجهة (بدون سيرفر)

1. سجّل الدخول في عربية  
2. افتح `/lughawi` → **الإعدادات**  
3. اختر المزود → الصق المفتاح → **حفظ**  
4. يظهر فقط `••••` + آخر 4 أحرف  
5. وضع Auto يجرّب مفاتيحك أولًا ثم مفاتيح المشروع

---

## هـ) ترتيب Auto داخل لغوي

```text
مفاتيح المستخدم (الافتراضي أولًا)
        ↓ فشل؟
مفاتيح مشروع عربية (حسب ترتيب المجمّع / المتغيرات)
        ↓ فشل الجميع؟
رسالة واضحة + بقاء التدقيق المحلي أوفلاين
```

---

## و) ماذا ترسل لي إن أردت أن أضبطها أنا؟

في رسالة خاصة داخل Cursor فقط:

```text
GROQ=gsk_...
GOOGLE=AIza...
OPENROUTER=sk-or-...
OPENAI=sk-...
ANTHROPIC=sk-ant-...
```

ثم احذف الرسالة بعد التأكيد. لن تُرفع المفاتيح إلى Git.

---

## ز) تحقق أن المجمّع يعمل

1. افتح `/lughawi` → الإعدادات  
2. يجب أن ترى سطرًا مثل: «مجمّع مشروع عربية جاهز: N مفتاحًا»  
3. جرّب **إعادة صياغة** على جملة قصيرة وأنت مسجّل الدخول
