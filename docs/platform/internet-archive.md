# Internet Archive — قناة اقتناء محلية

## الغرض
تنزيل **منظم للمراجعة** إلى `incoming/ia/` فقط. لا يُنشر شيء تلقائيًا إلى `data/` ولا إلى الواجهة.

## الأوامر
```bash
npm run fetch-ia-item -- --identifier=ITEM_ID
npm run fetch-ia-item -- --identifier=ITEM_ID --download-text
```

بعد التحقق من الحقوق وتحويل المحتوى إلى JSON المشروع:
```bash
npm run import-from-incoming -- --slug=my-slug --from=./incoming/prepared.json --i-confirm-rights
```

## قواعد الدمج إلى `/data`
يُسمح بالنقل فقط إذا تحقق أحد التالي:
1. بيان حقوق واضح يسمح بإعادة التوزيع في هذا المشروع، أو
2. ملف مرخّص من صاحب الحق، أو
3. محتوى أصيل أنتجه المشروع

**لا** يُستخدم مسار «إعادة صياغة لتخطي حقوق الغير».

## الحالة في الواجهة
كتب الفهرس تبقى `awaiting_license` حتى يصبح `status: ready` بعد استيراد مؤكَّد.
الإعراب الافتراضي في لوحة الدراسة يبقى كما هو (لا استبدال صامت).
