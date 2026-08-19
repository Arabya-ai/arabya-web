# دليل المالك — رفع كتاب إعراب (Word → JSON) واستيراد المحتوى

## الطريقة الأسهل (بدون أوامر)

1. سجّل الدخول بـ Google على [arabya.org](https://www.arabya.org)
2. افتح **حسابي** → **رفع كتاب إعراب** (`/account/import`)
3. اكتب **عنوان الكتاب**
4. ارفع **Word · Excel · PDF · CSV · JSON** أو الصق **رابط Google Sheets**
5. انتظر «جاهز» ثم جرّب **المصحف** — يظهر مصدرك في الإعراب

لا حاجة لـ Terminal ولا JSON يدوي.

---

## للمطور (اختياري — أوامر)

## 1) كتابك في Microsoft Word — كيف تُحوّله إلى JSON؟

### ما الذي نحتاجه؟

ملف **JSON واحد** يحتوي على:
- معلومات الكتاب (`meta`)
- قائمة آيات (`verses`) — كل آية فيها:
  - `verseKey` مثل `"1:1"` (سورة:آية)
  - `text` — إعراب الآية كاملة (اختياري)
  - `words` — قائمة كلمات، كل كلمة فيها:
    - `wordId` — معرّف عربية القياسي مثل `W:001:001:001`
    - `text` — إعراب هذه الكلمة
    - `evidence` — دليل أو ملاحظة (اختياري)

### شكل الملف (مثال مبسّط)

```json
{
  "meta": {
    "title": "إعرابي — كتاب المالك",
    "license": "owner",
    "source": "محتوى أصلي للمالك"
  },
  "verses": [
    {
      "verseKey": "1:1",
      "text": "إعراب الآية كاملة إن رغبت…",
      "words": [
        {
          "wordId": "W:001:001:001",
          "text": "«بسم» — جار ومجرور…",
          "evidence": ""
        }
      ]
    }
  ]
}
```

قالب جاهز في المشروع: `incoming/sample-owner-book.json`

### من Word إلى JSON — الطرق العملية

| الطريقة | متى تستخدمها |
|---------|----------------|
| **أ) Excel وسيط** | الأفضل لمعظم المالكين: Word → جدول (سورة، آية، wordId، نص) → حفظ CSV → تحويل CSV إلى JSON (نفّذ السكربت أو اطلب من الوكيل) |
| **ب) Google Sheets** | نفس فكرة Excel — مشاركة الجدول ثم تصدير JSON |
| **ج) تحرير JSON مباشرة** | لسورة واحدة تجريبية فقط |
| **د) سكربت تحويل مخصص** | عندما يكون Word منسّقًا بقالب ثابت — نكتب سكربت `word-to-json` حسب قالبك |

### كيف أعرف `wordId` لكل كلمة؟

1. افتح عربية: `/mushaf/1` أو `/surah/1`
2. انقر على الكلمة — في لوحة الدراسة يظهر المعرّف (أو من API: `/api/study?wordId=…`)
3. الصيغة: `W:XXX:YYY:ZZZ` — سورة ثلاث خانات · آية · ترتيب الكلمة

**مهم:** يجب أن تطابق الكلمات مصحف عربية (Madina / QPC) وإلا لن يظهر الإعراب في المكان الصحيح.

### خطواتك بعد تجهيز JSON

1. ضع الملف في مجلد `incoming/` على جهازك أو السيرفر، مثلاً:
   ```
   incoming/my-book.json
   ```
2. من جذر المشروع نفّذ (على جهاز المطور أو السيرفر):

```bash
npm run import-irab-book -- --slug=my-book --from=./incoming/my-book.json --claims
```

| الجزء | المعنى |
|-------|--------|
| `--slug=my-book` | اسم قصير إنجليزي للكتاب (بدون مسافات) |
| `--from=…` | مسار ملف JSON |
| `--claims` | يفعّل طبقة المصادر المتعددة في لوحة الدراسة |

3. **تحديث الفهرس:** السكربت يضبط `data/books/index.json` تلقائيًا إلى `"status": "ready"`. **لا تحتاج تعديل يدوي** إلا إذا أردت تغيير العنوان أو الوصف.

4. ارفع التغييرات إلى Git وانشر الموقع (أو اطلب من الوكيل النشر).

5. تحقق:
   - `/books/my-book` — عارض الكتاب
   - `/mushaf/1` — اختر كلمة → تبويب الإعراب → يظهر مبدّل المصدر إن وُجد أكثر من مصدر

### إن كان المحتوى من موقع (بعد سكرابينج) وليس Word

```bash
npm run import-from-incoming -- --slug=my-book --from=./incoming/prepared.json --i-confirm-rights --claims
```

`--i-confirm-rights` = تأكيدك أن لديك حق النشر أو أن المحتوى **أصلي** بعد إعادة الصياغة.

---

## 2) AnyPage Scraper — من الموقع إلى عربية

**AnyPage Scraper** (أو أي أداة سكرابينج) **خارج** مشروع عربية. التدفق:

```
موقع خارجي → AnyPage Scraper → ملف خام (HTML/JSON/CSV)
         ↓
   إعادة صياغة يدوية أو بالذكاء (محتوى حصري)
         ↓
   تحويل إلى شكل JSON أعلاه
         ↓
   incoming/your-file.json
         ↓
   import-irab-book أو import-from-incoming
```

### رفع عبر لوحة الحساب (بدون سطر أوامر)

1. سجّل الدخول بـ Google
2. `/account/edit/sources` (محرر/مدير)
3. **ارفع ملف JSON** — يُخزَّن «قيد المراجعة»
4. بعد مراجعتك، نفّذ الاستيراد على السيرفر بالأمر أعلاه

### قواعد مهمة

- لا تستورد HTML مباشرة — فقط JSON بالشكل الموحّد
- المحتوى المُعاد صياغته يجب أن يكون **حصريًا** ومرخّصًا للنشر
- للكتب المعروفة (درويش، التبيان…) استخدم `slug` مطابقًا للفهرس: `darwish`, `tibyan`, `kharrat`

---

## 3) ملخص الأوامر

```bash
# استيراد مباشر (ملفك في incoming/)
npm run import-irab-book -- --slug=SLUG --from=./incoming/FILE.json --claims

# بعد سكرابينج + تأكيد الحقوق
npm run import-from-incoming -- --slug=SLUG --from=./incoming/FILE.json --i-confirm-rights --claims

# التحقق من البيانات
npm run validate-data
npm run test
```

---

## 4) مطلوب منك الآن (اختبار سريع)

1. جهّز JSON لسورة الفاتحة فقط (7 آيات) كتجربة
2. ضعه في `incoming/test-fatiha.json`
3. نفّذ:
   ```bash
   npm run import-irab-book -- --slug=owner-test --from=./incoming/test-fatiha.json --claims
   ```
4. افتح `/mushaf/1` وتحقق من مبدّل المصدر في الإعراب

---

## 5) مراجع في المشروع

| الملف | الغرض |
|-------|--------|
| `scripts/import-irab-book.mjs` | السكربت الرئيسي |
| `docs/platform/books-irab.md` | تخطيط البيانات |
| `docs/platform/internet-archive.md` | قناة أرشيف إنترنت |
| `docs/platform/accounts-owner-guide-ar.md` | حسابات Google + SQLite |
