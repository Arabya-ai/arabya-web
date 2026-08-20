# أمر الدمج والنشر + قواعد البيانات على Contabo

> نفّذ من **PuTTY** فقط (ليس PowerShell).  
> الإنتاج = Contabo. **تجاهل فشل Vercel** — لم نعد نستخدمه.

---

## 0) ملاحظة Vercel الحمراء على GitHub

`Vercel — Account is blocked` **لا تمنع الدمج** وليست مطلوبة للنشر.

ماذا تفعل؟
1. تجاهلها تمامًا، أو  
2. من Vercel Dashboard افصل المشروع عن GitHub (Disconnect) حتى يختفي الفحص الأحمر لاحقًا.

النشر الحقيقي يتم بأمر Contabo أدناه.

---

## 1) تجهيز الـ PR للدمج

على صفحة PR #110:
1. اضغط **Ready for review** (يخرج من Draft).  
2. اضغط **Merge pull request** ثم **Confirm merge**.

---

## 2) أمر واحد: سحب + قواعد بيانات + نشر (الصقه في PuTTY)

```bash
cd /var/www/arabya-web && git fetch origin main && git checkout main && git pull --ff-only origin main && bash scripts/contabo-ensure-dbs.sh && bash scripts/contabo-deploy.sh
```

هذا يقوم بـ:
- سحب أحدث `main`
- إنشاء/تحديث **SQLite** للحسابات في `/var/lib/arabya/user-data.sqlite`
- تجهيز مجلدات الاستيراد + `.data` للغوي
- بناء الموقع وإعادة تشغيل PM2

---

## 3) تفعيل قاعدة المستخدمين في `.env` (مرة واحدة إن لم تكن مفعّلة)

```bash
cd /var/www/arabya-web
nano .env
```

تأكد من وجود:

```bash
ARABYA_USER_SYNC_ENABLED=1
ARABYA_USER_DB_PATH=/var/lib/arabya/user-data.sqlite
ARABYA_D1_ENABLED=0
```

احفظ (`Ctrl+O` Enter `Ctrl+X`) ثم:

```bash
pm2 restart arabya-web --update-env
```

---

## 4) ماذا يوجد من «قواعد بيانات» في عربية؟

| الغرض | النوع | المكان |
|--------|------|--------|
| القرآن / التراجم / التفاسير | ملفات JSON في Git | `/data` (ليست DB) |
| حسابات Google، إشارات، تقدّم قراءة | **SQLite** | `/var/lib/arabya/user-data.sqlite` |
| تعلّم لغوي + حصة + مفاتيح مشفّرة | ملفات تشغيل | `/var/www/arabya-web/.data/` |
| Cloudflare D1 | متوقف | لا تستخدمه (`ARABYA_D1_ENABLED=0`) |

---

## 5) تحقق بعد النشر

```bash
pm2 status
ls -la /var/lib/arabya/user-data.sqlite
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000/lughawi | head -5
```

ثم في المتصفح: https://www.arabya.org/lughawi

---

## 6) مفاتيح لغوي AI (اختياري بعد النشر)

انظر: `OWNER-KEYS-AR.md`

---

## 7) إن فشل السحب بسبب `learned-corrections.json`

التعلّم القديم كتب داخل ملف Git على السيرفر فمنع `git pull`.

**الصق هذا الآن في PuTTY (ينسخ نسخة احتياطية ثم ينشر):**

```bash
cd /var/www/arabya-web
cp -a data/lughawi/learned-corrections.json "/root/lughawi-learned-backup-$(date +%F-%H%M).json"
git checkout -- data/lughawi/learned-corrections.json
git pull --ff-only origin main
bash scripts/contabo-ensure-dbs.sh
bash scripts/contabo-deploy.sh
```
