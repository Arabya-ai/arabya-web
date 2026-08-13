import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
import { E2E_DEFAULT_EMAIL } from "../src/lib/e2e-auth";

async function e2eLogin(page: Page, email = E2E_DEFAULT_EMAIL) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const emailInput = page.locator("#e2e-email");
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.locator('button[type="submit"]', { hasText: /دخول اختبار|E2E|test/i }).click();
  await expect(page).toHaveURL(/account/, { timeout: 20_000 });
}

async function e2eLoginApi(request: APIRequestContext, email = E2E_DEFAULT_EMAIL) {
  const csrfRes = await request.get("/api/auth/csrf");
  expect(csrfRes.ok()).toBeTruthy();
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const loginRes = await request.post("/api/auth/callback/e2e", {
    form: {
      csrfToken,
      email,
      callbackUrl: "/account",
      json: "true",
    },
  });
  expect(loginRes.ok() || loginRes.status() === 302 || loginRes.status() === 200).toBeTruthy();
}

test.describe("authenticated sync + studio", () => {
  test.describe.configure({ mode: "serial" });

  test("E2E login reaches account and sync panel", async ({ page }) => {
    test.skip(process.env.ARABYA_E2E_AUTH !== "1", "Requires ARABYA_E2E_AUTH=1");
    await e2eLogin(page);
    await expect(page.locator("body")).toContainText(/مزامنة|Sync|حسابي|Account/i);
  });

  test("sync API push then pull round-trip", async ({ request }) => {
    test.skip(process.env.ARABYA_E2E_AUTH !== "1", "Requires ARABYA_E2E_AUTH=1");
    test.skip(process.env.ARABYA_USER_SYNC_ENABLED !== "1", "Requires ARABYA_USER_SYNC_ENABLED=1");

    await e2eLoginApi(request);

    const payload = {
      bookmarks: [
        {
          key: "1:1",
          surahId: 1,
          verse: 1,
          page: 1,
          savedAt: Date.now(),
        },
      ],
      notes: [
        {
          key: "1:1",
          surahId: 1,
          verse: 1,
          text: "e2e note",
          updatedAt: Date.now(),
        },
      ],
      study: [],
      progress: { lastPage: 7, habit: { streak: 1 } },
    };

    const put = await request.put("/api/sync", { data: payload });
    expect(put.status(), await put.text()).toBe(200);
    const putBody = await put.json();
    expect(putBody.ok).toBe(true);
    expect(putBody.bookmarks?.length).toBeGreaterThanOrEqual(1);

    const get = await request.get("/api/sync");
    expect(get.status()).toBe(200);
    const getBody = await get.json();
    expect(getBody.ok).toBe(true);
    expect(getBody.bookmarks.some((b: { key: string }) => b.key === "1:1")).toBe(
      true,
    );
    expect(getBody.notes.some((n: { text: string }) => n.text === "e2e note")).toBe(
      true,
    );
    expect(getBody.progress.lastPage).toBe(7);
  });

  test("studio dashboard and new project load after login", async ({ page }) => {
    test.skip(process.env.ARABYA_E2E_AUTH !== "1", "Requires ARABYA_E2E_AUTH=1");
    await e2eLogin(page);

    await page.goto("/studio", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/studio/projects/new?s=1&v=1&kind=image", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("body")).toContainText(/مشروع|Project|سورة|Surah|فاتحة|Fatiha/i);

    await page.goto("/studio/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/login/);
  });

  test("create ayahs API works when authenticated", async ({ request }) => {
    test.skip(process.env.ARABYA_E2E_AUTH !== "1", "Requires ARABYA_E2E_AUTH=1");
    await e2eLoginApi(request);
    const res = await request.get("/api/create/ayahs?s=1&from=1&to=7");
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();
    expect(body.surahId).toBe(1);
    expect(body.ayahs["1"]).toBeTruthy();
    expect(Object.keys(body.ayahs).length).toBe(7);
  });
});
