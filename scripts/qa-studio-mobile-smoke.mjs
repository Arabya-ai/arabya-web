/**
 * Mobile viewport smoke: studio editor controls stack without select bleed.
 * Run: node scripts/qa-studio-mobile-smoke.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const LOCALE = "ar";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ar",
  });
  const page = await context.newPage();

  const projectId = "qa-mobile-test";
  const seedProject = {
    id: projectId,
    title: "اختبار موبايل",
    reciterId: "Alafasy_128kbps",
    surahId: 55,
    ayahStart: 1,
    ayahEnd: 13,
    ratio: "9:16",
    bgType: "none",
    bgKind: "image",
    bgUrl: "",
    bgPoster: "",
    bgOpacity: 100,
    translationEnabled: false,
    tafsirEnabled: false,
    translationSlug: "saheeh-en",
    tafsirSlug: "muyassar",
    translationOverrides: {},
    tafsirOverrides: {},
    fontSize: 48,
    textColor: "#ffffff",
    surahLabelFontSize: 16,
    surahLabelTextColor: "#C8A951",
    surahLabelFontFamily: "IBM Plex Sans Arabic",
    translationFontSize: 22,
    translationTextColor: "#f0e6d0",
    tafsirFontSize: 18,
    tafsirTextColor: "#d4c4a8",
    overlayPosition: "center",
    overlayOpacity: 40,
    volume: 80,
    fadeIn: true,
    fadeOut: true,
    playbackRate: 1,
    softNormalize: true,
    pauseBetweenAyahsMs: 0,
    quality: "high",
    transition: "fade",
    transitionDuration: 0.6,
    visualizer: "bars",
    visualizerIntensity: 60,
    visualizerColor: "#C8A951",
    previewShowNavBar: true,
    previewShowAyahNumbers: true,
    previewShowAyahOnly: false,
    brandSignature: true,
    brandPosition: "bottom-left",
    softVignette: true,
    reciterPosition: "bottom-left",
    progressBarStyle: "none",
    progressBarColor: "#C8A951",
    status: "مسودة",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.goto(`${BASE}/${LOCALE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((project) => {
    localStorage.setItem("ayat_projects", JSON.stringify([project]));
  }, seedProject);

  await page.goto(`${BASE}/${LOCALE}/studio/editor/${projectId}`, {
    waitUntil: "networkidle",
  });

  const nativeSelectCount = await page.locator(".studio-native-select").count();
  if (nativeSelectCount < 2) {
    throw new Error(
      `Expected native selects on mobile, found ${nativeSelectCount}`,
    );
  }

  const controls = page.locator(".studio-editor-controls");
  const preview = page.locator(".studio-live-preview");
  await controls.waitFor({ state: "visible" });
  await preview.waitFor({ state: "visible" });

  const controlsBox = await controls.boundingBox();
  const previewBox = await preview.boundingBox();
  if (!controlsBox || !previewBox) {
    throw new Error("Could not measure editor panels");
  }

  if (previewBox.y < controlsBox.y + controlsBox.height - 8) {
    throw new Error(
      `Preview overlaps controls: controls bottom=${controlsBox.y + controlsBox.height}, preview top=${previewBox.y}`,
    );
  }

  const openRadixMenus = await page
    .locator("[data-radix-select-content]")
    .count();
  if (openRadixMenus > 0) {
    throw new Error("Radix select content visible on mobile (should use native)");
  }

  console.log("PASS studio mobile smoke");
  console.log(`  native selects: ${nativeSelectCount}`);
  console.log(
    `  layout: controls y=${Math.round(controlsBox.y)} h=${Math.round(controlsBox.height)}, preview y=${Math.round(previewBox.y)}`,
  );

  await browser.close();
}

main().catch((err) => {
  console.error("FAIL", err.message || err);
  process.exit(1);
});
