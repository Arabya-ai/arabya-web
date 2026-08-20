#!/usr/bin/env node
/**
 * Smoke-check public Arabya pages + APIs.
 * Usage:
 *   node scripts/smoke-services.mjs
 *   BASE_URL=https://www.arabya.org node scripts/smoke-services.mjs
 */
const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [
  { path: "/", expect: 200 },
  { path: "/mushaf/1", expect: 200 },
  { path: "/resources", expect: 200 },
  { path: "/books", expect: 200 },
  { path: "/qiraat", expect: 200 },
  { path: "/hadith", expect: 200 },
  { path: "/hadith/bukhari/1", expect: 200 },
  { path: "/heritage", expect: 200 },
  { path: "/adhkar", expect: 200 },
  { path: "/qibla", expect: 200 },
  { path: "/asma", expect: 200 },
  { path: "/library", expect: 200 },
  { path: "/study", expect: 200 },
  { path: "/about", expect: 200 },
  { path: "/api/asma-al-husna", expect: 200 },
  { path: "/api/hadith/search?q=%D8%A5%D9%86%D9%85%D8%A7", expect: 200 },
  {
    path: "/api/hadith/word-enrich?text=%D8%A5%D9%86%D9%85%D8%A7%20%D8%A7%D9%84%D8%A3%D8%B9%D9%85%D8%A7%D9%84",
    expect: 200,
  },
  { path: "/api/prayer-times?city=makkah", expect: 200 },
  { path: "/api/qibla?latitude=21.3891&longitude=39.8579", expect: 200 },
  { path: "/api/qibla?lat=21.3891&lon=39.8579", expect: 200 },
  { path: "/api/study?q=%D8%A7%D9%84%D9%84%D9%87", expect: 200 },
  { path: "/api/tafsir/muyassar/1?from=1&to=2", expect: 200 },
  { path: "/api/search?q=%D8%A7%D9%84%D8%AD%D9%85%D8%AF", expect: 200 },
];

async function main() {
  let failed = 0;
  console.log(`smoke against ${base}`);
  for (const c of checks) {
    const url = `${base}${c.path}`;
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { Accept: "text/html,application/json" },
        signal: AbortSignal.timeout(25000),
      });
      const ok = res.status === c.expect;
      if (!ok) failed += 1;
      console.log(`${ok ? "OK" : "FAIL"} ${res.status} ${c.path}`);
    } catch (err) {
      failed += 1;
      console.log(`FAIL ERR ${c.path} — ${err instanceof Error ? err.message : err}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nall ${checks.length} checks passed`);
}

main();
