import { chromium } from "playwright";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.addInitScript(() => {
  const Orig = window.Audio;
  window.Audio = function (...args) {
    const a = new Orig(...args);
    window.__lastAudio = a;
    return a;
  };
  window.Audio.prototype = Orig.prototype;
});

await page.goto(`${base}/mushaf/1`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector(".mtb-scope button", { timeout: 90000 });
await page.waitForTimeout(1500);

const modes = ["كلمات", "آية", "سورة"];
for (let i = 0; i < 3; i++) {
  await page.locator(".mtb-scope button").nth(i).click();
  await page.waitForTimeout(3500);
  const snap = await page.evaluate(() => {
    const a = window.__lastAudio;
    return {
      paused: a?.paused ?? null,
      ct: a?.currentTime ?? 0,
      src: (a?.src || "").slice(0, 80),
    };
  });
  const ok = snap.paused === false && snap.ct > 0.2 && !snap.src.startsWith("data:");
  console.log(`${modes[i]}: ${ok ? "PASS" : "FAIL"}`, JSON.stringify(snap));
  if (!ok) process.exitCode = 1;
  await page.locator(".mtb-scope button").nth(i).click();
  await page.waitForTimeout(500);
}

await browser.close();
process.exit(process.exitCode ?? 0);
