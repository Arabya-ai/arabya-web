import { expect, test } from "@playwright/test";

async function gotoOk(page: import("@playwright/test").Page, path: string) {
  let res = await page.goto(path, { waitUntil: "domcontentloaded" });
  if (!res || !res.ok()) {
    res = await page.goto(path, { waitUntil: "load" });
  }
  expect(res?.ok(), `GET ${path} → ${res?.status()}`).toBeTruthy();
  return res;
}

test.describe("smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("home Arabic renders brand and prayer panel", async ({ page }) => {
    await gotoOk(page, "/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("header .brand-name").first()).toContainText(
      /عربية|Arabya/i,
    );
    await expect(page.locator(".prayer-panel")).toBeVisible();
    await expect(page.locator("#prayer-h")).toContainText(/مواقيت|Prayer/i);
  });

  test("home English renders EN chrome and English prayer dates", async ({
    page,
  }) => {
    await gotoOk(page, "/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("header .brand-name").first()).toContainText(
      /Arabya/i,
    );
    await expect(page.locator(".prayer-panel")).toBeVisible();
    await expect(page.locator("#prayer-h")).toContainText("Prayer times");
    await expect(page.locator(".prayer-date-value").first()).toBeVisible({
      timeout: 20_000,
    });
    const dates = page.locator(".prayer-date-value");
    await expect(dates).toHaveCount(2);
    const hijri = await dates.nth(0).innerText();
    const gregorian = await dates.nth(1).innerText();
    expect(hijri).toMatch(/[A-Za-z]/);
    expect(gregorian).toMatch(/[A-Za-z]/);
    expect(hijri).not.toMatch(/[٠-٩]/);
    expect(gregorian).not.toMatch(/[٠-٩]/);
  });

  test("mushaf page 1 loads Madinah frame and word text", async ({ page }) => {
    await gotoOk(page, "/mushaf/1");
    await expect(page.locator(".mushaf-page")).toBeVisible({ timeout: 30_000 });
    // LCP: mushaf title h1 in banner top row (UI font, stable paint).
    await expect(page.locator(".mushaf-madinah-label")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator(".mushaf-text")).toBeVisible();
    await expect(page.locator(".mushaf-word").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("English mushaf page 1 keeps Uthmani mushaf text RTL", async ({
    page,
  }) => {
    await gotoOk(page, "/en/mushaf/1");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".mushaf-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".mushaf-page")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".mushaf-page")).toHaveAttribute("lang", "ar");
    await expect(page.locator(".mushaf-word").first()).toBeVisible();
  });

  test("clicking a mushaf word opens the study dock", async ({ page }) => {
    await gotoOk(page, "/en/mushaf/1");
    await expect(page.locator("button.mushaf-word").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.locator("button.mushaf-word").nth(2).click();
    await expect(page.locator(".word-dock")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".word-dock-ar")).toBeVisible();
    await expect(page.locator(".word-dock-key")).toHaveText(/^\d+:\d+$/);
    await expect(page.locator(".word-dock [role='tab']").first()).toBeVisible();
  });

  test("home search returns ayah results", async ({ page }) => {
    await gotoOk(page, "/en");
    const search = page.locator(".index-search-simple input[type='search']");
    await expect(search).toBeVisible();
    await search.fill("الحمد");
    await expect(page.locator("#ayah-search-h")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".ayah-search-hit").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("locale switcher moves Arabic home to English", async ({ page }) => {
    await gotoOk(page, "/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    // Language lives in the preferences menu (not a standalone locale dropdown).
    await page.locator(".nav .prefs-menu-trigger").click();
    await page
      .locator(".nav .prefs-menu-option", { hasText: "English" })
      .click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#prayer-h")).toContainText("Prayer times");
  });

  test("pricing page renders Free and Plus plans", async ({ page }) => {
    await gotoOk(page, "/en/pricing");
    await expect(page.locator("h1")).toContainText(/Plans/i);
    await expect(page.locator("#plan-free")).toBeVisible();
    await expect(page.locator("#plan-plus")).toBeVisible();
    await expect(page.locator(".pricing-paypal-note")).toContainText(/PayPal/i);
  });

  test("create image redirects guests to login", async ({ page }) => {
    await page.goto("/en/create/image", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/login/i);
  });
});
