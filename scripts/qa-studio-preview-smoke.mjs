/**
 * Verify studio preview frame renders with visible dimensions.
 * Run: node scripts/qa-studio-preview-smoke.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const LOCALE = "ar";
const projectId = "preview-smoke";

const seedProject = {
  id: projectId,
  title: "اختبار المعاينة",
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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  await page.goto(`${BASE}/${LOCALE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((project) => {
    localStorage.setItem("ayat_projects", JSON.stringify([project]));
  }, seedProject);

  await page.goto(`${BASE}/${LOCALE}/studio/editor/${projectId}`, {
    waitUntil: "networkidle",
  });

  if (page.url().includes("/login")) {
    throw new Error("Redirected to login — cannot smoke-test editor without auth");
  }

  const frame = page.locator(".studio-live-preview__frame");
  await frame.waitFor({ state: "visible", timeout: 15000 });

  const box = await frame.boundingBox();
  if (!box || box.width < 120 || box.height < 200) {
    throw new Error(
      `Preview frame too small or missing: ${JSON.stringify(box)}`,
    );
  }

  const bg = await frame.evaluate((el) => getComputedStyle(el).background);
  if (!bg || bg.includes("rgba(0, 0, 0, 0)")) {
    throw new Error(`Preview frame background missing: ${bg}`);
  }

  const hasAyahText = await frame.locator(".font-quran").count();
  if (hasAyahText < 1) {
    throw new Error("Preview frame missing ayah text");
  }

  const previewPanel = page.locator(".studio-live-preview");
  const panelBox = await previewPanel.boundingBox();
  const player = page.locator(".studio-live-preview .rounded-full.border.border-accent\\/30");
  const playerBox = await player.boundingBox();

  if (!panelBox || !playerBox) {
    throw new Error("Could not measure preview panel or player");
  }

  if (playerBox.y + playerBox.height > panelBox.y + panelBox.height + 4) {
    throw new Error("Audio player clipped outside preview panel");
  }

  console.log("PASS studio preview smoke");
  console.log(`  frame: ${Math.round(box.width)}x${Math.round(box.height)}`);
  console.log(`  panel: ${Math.round(panelBox.width)}x${Math.round(panelBox.height)}`);

  await browser.close();
}

main().catch((err) => {
  console.error("FAIL", err.message || err);
  process.exit(1);
});
