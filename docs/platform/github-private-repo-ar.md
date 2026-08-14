# جعل مستودع GitHub خاصاً (Private)

## لماذا؟

مستودع **Public** يسمح لأي شخص بنسخ **كل الكود** وملفات `/data` دفعة واحدة — أخطر من تقليد واجهة الموقع من الرابط فقط.

## الحالة

- المستودع: `Arabya-ai/arabya-web`
- بعد التخصيص: **Private** — السيرفر لا يستطيع `git pull` بدون مفتاح أو توكن.

---

## 1) تخصيص المستودع (مرة واحدة)

1. افتح: https://github.com/Arabya-ai/arabya-web/settings  
2. **Danger Zone** → **Change repository visibility** → **Make private**  
3. أكّد اسم المستودع  

---

## 2) ربط Contabo بالمستودع الخاص (مطلوب بعد Private)

عند `git pull` يظهر: `Username for 'https://github.com':` — هذا **طبيعي**. الحل الموصى به: **Deploy key** (مفتاح SSH للسيرفر فقط).

### أ) على السيرفر (SSH كـ root)

إذا علقت عند سؤال Username، اضغط **`Ctrl+C`** لإلغاء الأمر.

```bash
ssh-keygen -t ed25519 -C "contabo-arabya" -f /root/.ssh/arabya_github -N ""
cat /root/.ssh/arabya_github.pub
```

**انسخ** السطر الكامل الذي يبدأ بـ `ssh-ed25519 ...` (يظهر بعد أمر `cat`).

### ب) على GitHub

1. افتح: https://github.com/Arabya-ai/arabya-web/settings/keys  
2. **Add deploy key**  
3. Title: `Contabo VPS`  
4. Key: الصق المفتاح العام  
5. **Allow write access**: اتركه **غير مفعّل** (قراءة فقط)  
6. **Add key**

### ج) على السيرفر — ضبط Git لاستخدام SSH

```bash
cat >> /root/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/arabya_github
  IdentitiesOnly yes
EOF
chmod 600 /root/.ssh/config

cd /var/www/arabya-web
git remote set-url origin git@github.com:Arabya-ai/arabya-web.git

# اختبار (قد يظهر رسالة GitHub — طبيعي)
ssh -T git@github.com

git pull origin main
bash scripts/contabo-deploy.sh
```

---

## 3) بديل: توكن شخصي (أقل أماناً)

إن فضّلت HTTPS:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
2. **Generate new token** — صلاحية **repo** فقط  
3. على السيرفر عند `git pull`:
   - Username: اسم مستخدم GitHub  
   - Password: **التوكن** (وليس كلمة مرور الحساب)

---

## بعد النجاح

- الزوار يرون الموقع على `arabya.org` — التخصيص يخص GitHub فقط.
- كل تحديث: `cd /var/www/arabya-web && bash scripts/contabo-deploy.sh`
- تحقق: https://www.arabya.org/terms
