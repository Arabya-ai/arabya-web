import fs from "node:fs";
const s = fs.readFileSync("src/ayat-studio/pages/Landing.tsx", "utf8");
console.log(
  [...s.matchAll(/from ["']([^"']+)["']/g)].map((m) => m[1]).slice(0, 10),
);
console.log("button exists", fs.existsSync("src/ayat-studio/components/ui/button.tsx"));
