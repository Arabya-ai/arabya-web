# أمر الدمج والنشر — لغوي / عربية (نسخ ولصق)

> نفّذ هذا من **PuTTY** على سيرفر Contabo (مستخدم `root`)، وليس من PowerShell في ويندوز.

---

## الخطوة 1 — دمج الفرع في GitHub (من جهازك أو من GitHub)

### الطريقة الأسهل (موقع GitHub)
1. افتح: https://github.com/Arabya-ai/arabya-web/pull/110  
2. اضغط **Merge pull request** ثم **Confirm merge**.

### أو من سطر أوامر فيه `gh` (اختياري)
```bash
gh pr merge 110 --merge --delete-branch=false
```

---

## الخطوة 2 — نشر Contabo كامل (أمر واحد يعمل مباشرة)

ادخل PuTTY → `root@IP_السيرفر` ثم الصق:

```bash
cd /var/www/arabya-web && git fetch origin main && git checkout main && git pull --ff-only origin main && bash scripts/contabo-deploy.sh
```

انتظر حتى ترى: `Deploy done`.

---

## الخطوة 3 — تحقق سريع بعد النشر

في المتصفح:
1. https://www.arabya.org/lughawi  
2. اضغط «مثال 1» ثم «تصحيح»  
3. تأكد أن الاقتراحات تظهر

من السيرفر (اختياري):

```bash
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000/lughawi | head -5
pm2 status
```

---

## إن فشل السحب بسبب تعديلات محلية على السيرفر

```bash
cd /var/www/arabya-web
git fetch origin main
git reset --hard origin/main
bash scripts/contabo-deploy.sh
```

> `reset --hard` يلغي أي تعديل محلي غير محفوظ في Git على السيرفر. مفاتيح `.env` تبقى إن كان الملف غير متتبَّع في Git.

---

## بعد النشر — تفعيل مفاتيح الذكاء الاصطناعي

اتبع الملف: `specs/001-lughawi-proofreader/OWNER-KEYS-AR.md`  
ثم:

```bash
cd /var/www/arabya-web
nano .env
# أضف المفاتيح ثم Ctrl+O Enter ثم Ctrl+X
pm2 restart arabya-web --update-env
```
