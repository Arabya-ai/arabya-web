# جعل مستودع GitHub خاصاً (Private)

## لماذا؟

مستودع **Public** يسمح لأي شخص بنسخ **كل الكود** وملفات `/data` دفعة واحدة — أخطر من تقليد واجهة الموقع من الرابط فقط.

## الحالة

- المستودع: `Arabya-ai/arabya-web`
- بعد التخصيص: **Private** — السيرفر لا يستطيع `git pull` بدون توكن.

---

## 1) تخصيص المستودع (مرة واحدة)

1. افتح: https://github.com/Arabya-ai/arabya-web/settings  
2. **Danger Zone** → **Change repository visibility** → **Make private**  
3. أكّد اسم المستودع  

---

## 2) ربط Contabo بالمستودع الخاص

عند `git pull` يظهر: `Username for 'https://github.com':` — **طبيعي**.

> **Deploy keys معطّلة:** في منظمة **Arabya-ai** قد تظهر **Disabled by Arabya-ai** — لا تستخدم Deploy keys. استخدم **Personal Access Token** (PAT) أدناه.

### أ) إنشاء التوken (مرة واحدة — من المتصفح)

1. افتح: https://github.com/settings/tokens  
2. **Generate new token** → **Generate new token (classic)**  
3. Note: `Contabo arabya deploy`  
4. Expiration: 90 days (أو حسب رغبتك)  
5. الصلاحيات: **`repo`** فقط  
6. **Generate token** — **انسخ التوken فوراً** (لن يظهر مرة أخرى)

### ب) على السيرفر (SSH)

إذا علقت عند Username، اضغ **`Ctrl+C`**.

```bash
cd /var/www/arabya-web
git remote set-url origin https://github.com/Arabya-ai/arabya-web.git
git config --global credential.helper store
git pull origin main
```

عند السؤال:
- **Username:** اسم مستخدم GitHub (مثل بريدك/اسمك على GitHub)
- **Password:** **التوken** (وليس كلمة مرور GitHub)

بعد نجاح pull مرة واحدة، يُحفظ في `/root/.git-credentials` ولا يُسأل مجدداً:

```bash
chmod 600 /root/.git-credentials
bash scripts/contabo-deploy.sh
```

### ج) أمان

- لا ترسل التوken في الدردشة.  
- إن تسرّب: احذفه من GitHub وأنشئ توkenاً جديداً.

---

## 3) Deploy keys (غير متاح حالياً)

صفحة https://github.com/Arabya-ai/arabya-web/settings/keys تظهر **Disabled by Arabya-ai**.  
لتفعيلها يحتاج **مدير المنظمة** تغيير السياسة — أو استمر مع PAT أعلاه.

---

## بعد النجاح

- الزوار يرون الموقع على `arabya.org` — التخصيص يخص GitHub فقط.
- كل تحديث: `cd /var/www/arabya-web && bash scripts/contabo-deploy.sh`
- تحقق: https://www.arabya.org/terms
