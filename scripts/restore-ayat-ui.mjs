import fs from "node:fs";
import path from "node:path";

const src = "C:/Users/drmoh/Projects/ayat-creator-pro-tmp/src/components/ui";
const dst = "src/ayat-studio/components/ui";

const keep = [
  "button",
  "card",
  "input",
  "label",
  "select",
  "slider",
  "switch",
  "table",
  "sheet",
  "skeleton",
  "tooltip",
  "separator",
  "dialog",
  "scroll-area",
  "progress",
  "badge",
  "avatar",
  "checkbox",
  "collapsible",
  "dropdown-menu",
  "popover",
  "tabs",
  "textarea",
  "sonner",
];

for (const n of keep) {
  const from = path.join(src, `${n}.tsx`);
  const to = path.join(dst, `${n}.tsx`);
  let s = fs.readFileSync(from, "utf8");
  s = s
    .replaceAll("@/components/", "@/ayat-studio/components/")
    .replaceAll("@/lib/", "@/ayat-studio/lib/")
    .replaceAll("@/hooks/", "@/ayat-studio/hooks/");
  if (!s.startsWith('"use client"') && !s.startsWith("'use client'")) {
    s = `"use client";\n${s}`;
  }
  fs.writeFileSync(to, s, "utf8");
}

console.log("restored:", fs.readdirSync(dst).sort().join(", "));
console.log(
  "arabic in button?",
  /[\u0600-\u06FF]/.test(fs.readFileSync(path.join(dst, "button.tsx"), "utf8")) ||
    "n/a",
);
