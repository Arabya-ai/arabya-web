import { expect, type Page, type Response } from "@playwright/test";

/**
 * Navigate and wait out Next.js streaming SSR, which can briefly leave
 * duplicate route trees (e.g. two `.mushaf-page` / search inputs) until
 * flight containers like `#S:1` settle.
 */
export async function gotoOk(page: Page, path: string): Promise<Response | null> {
  let res = await page.goto(path, { waitUntil: "domcontentloaded" });
  if (!res || !res.ok()) {
    res = await page.goto(path, { waitUntil: "load" });
  }
  expect(res?.ok(), `GET ${path} → ${res?.status()}`).toBeTruthy();
  await page.waitForLoadState("load").catch(() => undefined);
  await page
    .waitForFunction(
      () => !document.querySelector('[id^="S:"]'),
      null,
      { timeout: 15_000 },
    )
    .catch(() => undefined);
  return res;
}

/** Prefer the visible instance when streaming left a hidden duplicate. */
export function visibleFirst(page: Page, selector: string) {
  return page.locator(selector).filter({ visible: true }).first();
}
