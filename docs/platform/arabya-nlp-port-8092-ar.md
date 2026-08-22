# Arabya NLP على Contabo — المنفذ 8092 (localhost فقط)

## كيف يصل الزائر إلى التدقيق؟ (مهم)

المتصفح **لا** يتصل بـ `:8092` مباشرة — ولا يحتاج مسار Nginx عامًا إلى FastAPI، ولا يحتاج فتح المنفذ في UFW للعامة.

```
الزائر → https://www.arabya.org/lughawi
       → POST /api/lughawi/proofread   (Next.js على :3000 عبر LiteSpeed)
       → http://127.0.0.1:8092/v1/proofread   (FastAPI داخل السيرفر فقط)
```

### لا تفعل هذا (يكسر النظام أو يعرّضه)
- **لا** تضع `ARABYA_NLP_URL=https://arabya.org` أو `https://www.arabya.org`  
  Next سيحاول طلب `/v1/proofread` من نفسه (حلقة أو 404) بدل FastAPI المحلي.
- **لا** تفتح مسار Nginx/OLS عامًا إلى `:8092` للجمهور (يعرّض واجهة DevOps و`/docs` و`/dashboard`).
- **لا** تشغّل `ufw allow 8092/tcp` ولا تربط FastAPI على `0.0.0.0` في الإنتاج.
- المتصفح **لا** يرى `127.0.0.1` أبدًا؛ الاتصال المحلي يحدث داخل سيرفر Contabo بين Next وFastAPI.

### الإعداد الصحيح
في `/var/www/arabya-web/.env`:

```bash
ARABYA_NLP_URL=http://127.0.0.1:8092
ARABYA_NLP_PROOFREAD=1
ARABYA_NLP_HOST=127.0.0.1
ARABYA_NLP_PORT=8092
```

صلاحيات الأسرار على سيرفر ServerAvatar المشترك:

```bash
chmod 600 /var/www/arabya-web/.env /var/www/arabya-web/.env.local /var/www/arabya-web/.env.production.local
```

بعد تشغيل FastAPI، اربط Next بالمحرك (لا يغيّر الربط إلى العام):

```bash
cd /var/www/arabya-web
bash scripts/contabo-wire-arabya-nlp-proxy.sh
```

---

## ServerAvatar — لا تخلط الشاشات

- `Applications → … → Fail2Ban` و«8G Firewall» **ليست** جدار منافذ TCP للخدمة `:8092`.
- اترك 8G **Disabled** ما لم يطلب فريق الاستضافة غير ذلك.
- لا تضف تطبيق Node/PHP جديد على المنفذ 8092 داخل ServerAvatar.

---

## أوامر root الآمنة (PuTTY)

```bash
cd /var/www/arabya-web

# 1) أغلق أي سماح عام سابق للمنفذ
bash scripts/contabo-arabya-nlp-firewall.sh

# 2) اربط FastAPI على localhost فقط
sed -i 's/^ARABYA_NLP_HOST=.*/ARABYA_NLP_HOST=127.0.0.1/' .env
grep '^ARABYA_NLP_HOST=' .env
chmod 600 .env .env.local .env.production.local 2>/dev/null || true

# 3) أعد تشغيل NLP فقط
bash scripts/contabo-arabya-nlp.sh
pm2 save

# 4) تحقق
ss -tlnp | grep 8092
# يجب أن ترى 127.0.0.1:8092 فقط — وليس 0.0.0.0:8092
curl -s http://127.0.0.1:8092/health | python3 -m json.tool
# من جهازك: http://SERVER_IP:8092/health يجب أن يفشل أو ينتظر دون JSON
```

فحص صحة NLP محلياً: الرابط الكامل `http://127.0.0.1:8092/health` (وليس `http://127.0.0` المقطوع).

---

## قائمة تحقق (أخضر)

| فحص | أخضر |
|-----|------|
| محلي `/health` | JSON فيه `"service":"arabya-nlp"` |
| `ss` | `127.0.0.1:8092` فقط |
| `ufw status \| grep 8092` | لا يظهر `ALLOW Anywhere` |
| من الإنترنت `SERVER_IP:8092` | فشل/timeout — **ليس** JSON |
| `https://www.arabya.org/lughawi` + تدقيق قصير | HTTP 200 وتصحيحات القواعد |

> ملاحظة أمنية: لا تضع كلمات مرور SSH/SFTP في الدردشة. غيّرها من ServerAvatar عند الشك.
