import fs from "node:fs";

const p = "src/ayat-studio/pages/Landing.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace(
  /\{ q: "هل المنصة مجانية بالكامل؟", a: "[^"]+" \}/,
  '{ q: "هل المنصة مجانية بالكامل؟", a: "يمكنك استكشاف الاستوديو بعد تسجيل الدخول. تصدير MP4 متاح لخطة عربية بلس — انظر صفحة الأسعار." }',
);
s = s.replace(
  /\{ q: "كم يستغرق التصدير؟", a: "[^"]+" \}/,
  '{ q: "كم يستغرق التصدير؟", a: "عادة من ١-٣ دقائق حسب طول التلاوة والجودة. يتم التصدير في Chrome أو Edge." }',
);
fs.writeFileSync(p, s);
console.log("plus faq", s.includes("عربية بلس"));
