# فتح منفذ 8092 لـ Arabya NLP (Contabo + ServerAvatar)

**المشكلة:** صفحة ServerAvatar الافتراضية (HTML) تظهر بدل استجابة FastAPI (JSON) على المنفذ `8092`.

**الحل:** ثلاثة أشياء معًا:

1. جدار حماية Ubuntu (UFW) يسمح بـ TCP `8092`
2. قاعدة واردة (Inbound) في لوحة ServerAvatar لنفس المنفذ
3. FastAPI يستمع على `0.0.0.0:8092` ثم إعادة تشغيل PM2

---

## 1) أوامر PuTTY / SSH على Contabo (انسخ والصق)

```bash
cd /var/www/arabya-web
git pull origin main
bash scripts/contabo-arabya-nlp-firewall.sh
# أو يدويًا:
# sudo ufw allow 8092/tcp
# sudo ufw reload
# sudo ufw status

# تأكد أن الإعدادات تفرض الاستماع على كل الواجهات
grep -E '^(ARABYA_NLP_HOST|ARABYA_NLP_PORT)=' .env || true
# يجب أن ترى: ARABYA_NLP_HOST=0.0.0.0

bash scripts/contabo-arabya-nlp.sh
pm2 save

# اختبار أخضر = JSON (وليس HTML)
curl -s http://127.0.0.1:8092/health | python3 -m json.tool
ss -tlnp | grep 8092
```

**معنى الاختبار:** إذا ظهر `{ ... }` فالخدمة صحيحة. إذا ظهر `<html>` أو كلمة ServerAvatar فالقناة ما زالت مختطفة.

---

## 2) قاعدة واردة في لوحة ServerAvatar (بالضغط)

ServerAvatar يدير جدار حماية خاصًا فوق UFW أحيانًا — بدون هذه القاعدة قد يبقى المنفذ مغلقًا من الخارج.

1. افتح [ServerAvatar](https://app.serveravatar.com) وسجّل الدخول.
2. اختر **السيرفر** الخاص بـ Contabo (الذي يشغّل `arabya.org`).
3. من القائمة الجانبية افتح **Firewall** (أو **Security → Firewall** حسب الواجهة).
4. اضغط **Add Rule** / **Add Inbound Rule**.
5. املأ الحقول:
   - **Type / Protocol:** Custom TCP (أو TCP)
   - **Port:** `8092`
   - **Source:** `0.0.0.0/0` (أو IP ثابت إن أردت تقييد الوصول)
   - **Action:** Allow / Accept
   - **Comment:** `arabya-nlp`
6. احفظ القاعدة وتأكد أنها ظاهرة في قائمة القواعد بحالة **Active**.
7. إن وُجد زر **Apply / Reload Firewall** اضغطه.

> ملاحظة: لا تضف تطبيقًا جديدًا من نوع Node/PHP على المنفذ 8092 داخل ServerAvatar — ذلك يعيد اختطاف المنفذ. القاعدة هنا «جدار حماية فقط»، والعملية الحقيقية تبقى `pm2` باسم `arabya-nlp`.

---

## 3) ماذا تغيّر في الكود

- `ARABYA_NLP_HOST` الافتراضي = `0.0.0.0` (بدل `127.0.0.1`)
- `uvicorn.run(..., host=settings.host or "0.0.0.0", port=8092, reload=False)`
- سكربت التفعيل يرفض استجابة HTML من ServerAvatar ويطلب JSON من `/health`

---

## 4) قائمة تحقق سريعة (أخضر / أحمر)

| فحص | أمر / مكان | أخضر |
|-----|------------|------|
| UFW | `sudo ufw status \| grep 8092` | `8092/tcp ALLOW` |
| ServerAvatar | لوحة Firewall | قاعدة Inbound TCP 8092 |
| PM2 | `pm2 describe arabya-nlp` | `online` |
| استماع | `ss -tlnp \| grep 8092` | عملية `python` / `main.py` وليست OLS |
| صحة | `curl -s http://127.0.0.1:8092/health` | JSON وليس HTML |

بعد الدمج إلى `main` شغّل على Contabo:

```bash
cd /var/www/arabya-web && bash scripts/contabo-deploy.sh
# أو على الأقل:
bash scripts/contabo-arabya-nlp-firewall.sh && bash scripts/contabo-arabya-nlp-activate.sh
```
