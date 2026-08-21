# فتح منفذ 8092 لـ Arabya NLP (Contabo + ServerAvatar)

## كيف يصل الزائر إلى التدقيق؟ (مهم)

المتصفح **لا** يتصل بـ `:8092` مباشرة — ولا يحتاج مسار Nginx عامًا إلى FastAPI.

```
الزائر → https://www.arabya.org/lughawi
       → POST /api/lughawi/proofread   (Next.js على :3000 عبر LiteSpeed)
       → http://127.0.0.1:8092/v1/proofread   (FastAPI داخل السيرفر فقط)
```

### لا تفعل هذا (يكسر النظام)
- **لا** تضع `ARABYA_NLP_URL=https://arabya.org` أو `https://www.arabya.org`  
  Next سيحاول طلب `/v1/proofread` من نفسه (حلقة أو 404) بدل FastAPI المحلي.
- **لا** تفتح مسار Nginx/OLS عامًا إلى `:8092` للجمهور (يعرّض واجهة DevOps).  
  الباب العام الصحيح هو `/api/lughawi/proofread` فقط.
- المتصفح **لا** يرى `127.0.0.1` أبدًا؛ الاتصال المحلي يحدث داخل سيرفر Contabo بين Next وFastAPI.

بعد تشغيل FastAPI، اربط Next بالمحرك:

```bash
cd /var/www/arabya-web
bash scripts/contabo-wire-arabya-nlp-proxy.sh
```

هذا يضبط في `.env`:
- `ARABYA_NLP_URL=http://127.0.0.1:8092`
- `ARABYA_NLP_PROOFREAD=1`

ثم يعيد تشغيل `arabya-web` ويختبر المسار العام.

مسار الواجهة يستدعي Ollama المحلي (`llama3.1:8b`) عند التدقيق الكامل (`useAi` افتراضيًا).
تعديلات النموذج يجب أن تحمل مواضع حروف صحيحة حتى يلوّن الموقع الأخطاء (أُصلح سقوط `start=0,end=0`).

## حالة السيرفر (فحص SSH فعلي)

| فحص | النتيجة |
|-----|---------|
| `curl http://127.0.0.1:8092/health` | **أخضر** — JSON من FastAPI (`service=arabya-nlp`) |
| الاستماع | `127.0.0.1:8092` فقط (عملية `root` عبر PM2) |
| من الخارج `IP:8092` | مرفوض — الخدمة لا تسمع على الشبكة العامة بعد |
| مستخدم SFTP للتطبيق (`arabyaorg`) | **ليس في sudoers** — لا يقدر يغيّر UFW ولا يعدّل `/var/www/arabya-web/.env` |
| شاشة Application → Fail2Ban | **ليست جدار حماية** — هي حظر محاولات دخول وهمية (wp-login) فقط |

**خلاصة للمالك:** Next.js على نفس Contabo يتحدث مع NLP عبر `127.0.0.1` و**هذا الجزء يعمل الآن**.  
فتح المنفذ للعالم الخارجي يحتاج **دخول root** (ليس مستخدم التطبيق في ServerAvatar).

---

## أين تبحث في ServerAvatar؟

أنت فتحت:  
`Servers → arabya → Applications → arabyaorg → Fail2Ban`  
هذا **ليس** Firewall.

جرّب بالترتيب:

1. ارجع لصفحة **السيرفر** نفسه (ليس التطبيق):  
   `Servers → arabya (169.58.169.79)`  
   ثم ابحث عن **Security** أو **Firewall** أو **CSF** في قائمة السيرفر (يسار الشاشة على مستوى السيرفر).
2. إن لم تجد أي Firewall: تجاهل ServerAvatar لهذا الجزء واستخدم **UFW عبر root** أدناه (الأضمن).
3. لوحة Contabo أيضاً قد يكون فيها «Firewall» منفصل — افتح TCP `8092` هناك إن وُجد.

لا تضف تطبيق Node/PHP جديد على المنفذ 8092 داخل ServerAvatar.

---

## أوامر root المطلوبة (PuTTY / كونسول Contabo / ServerAvatar Root SSH)

بعد الدخول كـ **root** (أو مستخدم معه `sudo` حقيقي):

```bash
# 1) جدار الحماية
ufw allow 8092/tcp comment 'arabya-nlp FastAPI'
ufw reload
ufw status | grep 8092

# 2) اجعل FastAPI يسمع على كل الواجهات
cd /var/www/arabya-web
sed -i 's/^ARABYA_NLP_HOST=.*/ARABYA_NLP_HOST=0.0.0.0/' .env
grep '^ARABYA_NLP_HOST=' .env

# 3) أعد تشغيل العملية تحت PM2 الخاص بـ root
bash scripts/contabo-arabya-nlp.sh
pm2 save

# 4) تحقق
ss -tlnp | grep 8092
# يجب أن ترى *:8092 أو 0.0.0.0:8092 وليس 127.0.0.1 فقط
curl -s http://127.0.0.1:8092/health | python3 -m json.tool
```

أو سطر واحد بعد `git pull`:

```bash
cd /var/www/arabya-web && bash scripts/contabo-arabya-nlp-firewall.sh && \
  sed -i 's/^ARABYA_NLP_HOST=.*/ARABYA_NLP_HOST=0.0.0.0/' .env && \
  bash scripts/contabo-arabya-nlp.sh && \
  curl -s http://127.0.0.1:8092/health | python3 -m json.tool
```

---

## قائمة تحقق

| فحص | أخضر |
|-----|------|
| محلي `/health` | JSON فيه `"service":"arabya-nlp"` |
| `ss` | `0.0.0.0:8092` أو `*:8092` |
| `ufw status \| grep 8092` | `ALLOW` |
| من جهازك: `curl http://SERVER_IP:8092/health` | JSON (اختياري — فقط إن أردت وصولاً خارجياً) |

> ملاحظة أمنية: لا تضع كلمة مرور SSH في الدردشة مرّة أخرى إن أمكن — غيّرها من ServerAvatar بعد الانتهاء، وأرسل **root** فقط عبر قناة خاصة.
