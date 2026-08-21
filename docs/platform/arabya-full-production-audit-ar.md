# تقرير مراجعة إنتاج عربية (شامل) — 21 أغسطس 2026

**المستودع:** `Arabya-ai/arabya-web`  
**الهدف:** إعادة الموقع للجمهور + جرد المشكلات التقنية/الأمنية/المنتج  
**حالة الإنتاج عند الفحص:** `https://www.arabya.org` → **503**  
**PM2 الظاهر من المالك:** `arabya-web` بعد restart مع **~1010 إعادة تشغيل** (crash-loop)، و`arabya-nlp` / `arabya-mpt-api` متوقفان (مقبول لتوفير الموارد).

> ملاحظة صدق مهني: مشروع عربية يحتوي آلاف ملفات JSON تحت `/data`. هذه المراجعة غطّت **كود التطبيق والنشر والأمن والمسارات العامة** بشكل منهجي، وليست مطالعة حرفية لكل ملف بيانات.

---

## أ) تشخيص العطل الحالي (الأولوية القصوى)

### السبب الجذري الأرجح
1. أثناء `npm ci` على Contabo يظهر `tar TAR_ENTRY_ERROR ENOENT` على `node_modules/next/dist`.
2. `npm ci` قد يخرج بـ exit 0 رغم أن `next` ناقص.
3. سكربت النشر كان يستعيد `.next.prev-good` ثم يعمل `pm2 restart` حتى لو `node_modules` مكسور.
4. `next start` يفشل فوراً → PM2 يعيد التشغيل بلا سقف → crash-loop → **503**.

### ما تم إصلاحه في هذا الفرع
| الإصلاح | الملف |
|---------|--------|
| التحقق من جاهزية الشجرة قبل أي restart | `scripts/contabo-deploy-lib.sh` |
| إيقاف كل تطبيقات PM2 أثناء التثبيت | `scripts/contabo-deploy.sh` |
| عدم restart على شجرة مكسورة | نفس السكربت |
| الإبقاء على `.next.prev-good` حتى نجاح health check | نفس السكربت |
| فشل النشر إن لم يستجب `:3000` | نفس السكربت |
| حد إعادة التشغيل + رفع ذاكرة PM2 إلى 1500M | `deploy/contabo/ecosystem.config.cjs` |
| ضيوف لغوي لا يستهلكون مفاتيح AI للمشروع | `src/app/api/lughawi/proofread/route.ts` |
| ترتيب IP أوثق لـ rate-limit | `src/lib/rate-limit.ts` |
| `/mushaf` → `/mushaf/1` | `src/app/[locale]/mushaf/page.tsx` |

### أوامر Contabo الآن
```bash
cd /var/www/arabya-web
pm2 stop arabya-web arabya-nlp arabya-mpt-api lughawi-sidecar 2>/dev/null || true
pm2 logs arabya-web --lines 80 --nostream
test -f .next/BUILD_ID || { [ -d .next.prev-good ] && rm -rf .next && mv .next.prev-good .next; }
test -f node_modules/next/dist/bin/next && test -f .next/BUILD_ID && \
  pm2 delete arabya-web 2>/dev/null; pm2 start deploy/contabo/ecosystem.config.cjs || \
  (rm -rf node_modules ~/.npm/_cacache && npm cache clean --force && bash scripts/contabo-deploy.sh)
curl -sI -H "Host: www.arabya.org" http://127.0.0.1:3000/ | head -5
pm2 status
```

---

## ب) الأمن (Backend / API)

### حرج/عالي
| # | الشدة | المشكلة | الحالة |
|---|--------|---------|--------|
| S1 | حرج | ضيوف يحرقون مفاتيح AI للمشروع | أُصلح |
| S2 | حرج | تزوير IP عبر XFF | أُصلح |
| S3 | عالي | transcribe بلا auth | متبقٍ |
| S4 | عالي | تعلّم لغوي بقبول واحد | متبقٍ |
| S5 | عالي | xlsx CVE | متبقٍ |
| S6 | عالي | رفع استيراد لأي عضو | متبقٍ |
| S7 | عالي | سر تشفير افتراضي | متبقٍ |

### متوسط
Auth middleware غير موحّد، admin مع roleUnverified، إيميلات super-admin في git، لا HSTS في next.config، CSP unsafe-inline، next-auth beta، BYOK في ملف محلي.

### سليم نسبياً
requireAdmin، SSRF allowlist للاستوديو، Worker HMAC، E2E auth معطّل في الإنتاج.

---

## ج) المنتج / الواجهة
| المشكلة | الحالة |
|---------|--------|
| الإنتاج 503 | يعتمد على النشر |
| طبقة البلاغة فارغة | متبقٍ (بيانات) |
| `/mushaf` 404 | أُصلح |
| تسويق حديث/تراث/كتب كـ«حية» وهي جزئية | متبقٍ |
| لا loading.tsx | متبقٍ |
| علامة teal/RTL | سليمة |

---

## د) موارد Contabo — ما لا تحتاجه يومياً
أبقِ متوقفاً إن لم تستخدمه: `arabya-nlp`، `arabya-mpt-api`، Ollama، نماذج Alnnahwi/Whisper الثقيلة.  
أبقِ: `arabya-web`. Sidecar اختياري. GEC العصبي يبقى متوقفاً افتراضياً.

---

## هـ) حكم الجاهزية للجمهور
**غير جاهز 100%** طالما الموقع 503، وبعد العودة: المصحف+لغوي الأساسيان صالحان لإطلاق محدود؛ الحديث/التراث التسويقي الكامل + بنود الأمن المتبقية يجب جدولتها قبل إطلاق عام واثق.

## و) ما لم يُراجع سطراً بسطر
ملفات `data/translations` و`data/tafsirs` الضخمة، وكل سطور MoneyPrinterTurbo، واختبار E2E يدوي كامل بعد استقرار HTTP 200.
