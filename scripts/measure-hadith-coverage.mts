import { readFileSync, writeFileSync } from "node:fs";
import { enrichHadithToken } from "../src/lib/hadith-word-enrich.ts";

const top = JSON.parse(
  readFileSync("/tmp/hadith-top-tokens.json", "utf8"),
) as [string, number][];

const none: { t: string; n: number }[] = [];
const ok: { t: string; n: number; st: string }[] = [];

for (const [t, n] of top) {
  const r = await enrichHadithToken(t);
  if (r.matchStatus === "none") none.push({ t, n });
  else ok.push({ t, n, st: r.matchStatus });
}

console.log(
  `top${top.length} covered ${ok.length} none ${none.length} coverage ${((ok.length / top.length) * 100).toFixed(1)}%`,
);
console.log(none.map((x) => `${x.n}\t${x.t}`).join("\n"));
writeFileSync("/tmp/hadith-none-top.json", JSON.stringify(none, null, 2));
