import { describe, expect, it } from "vitest";
import {
  addAdminPoolKey,
  bulkAddAdminPoolKeys,
  deleteAdminPoolKey,
  listAdminPoolDecrypted,
  listAdminPoolPublic,
} from "@/lib/lughawi/admin-pool-store";
import { countArabicWords, lughawiMonthlyQuotaWords } from "@/lib/lughawi/config";

describe("admin encrypted pool", () => {
  it("adds, lists without exposing full key, and deletes", () => {
    process.env.LUGHAWI_ADMIN_POOL_FILE = `${process.cwd()}/.data/test-admin-pool-${Date.now()}.json`;
    const created = addAdminPoolKey({
      provider: "google",
      apiKey: "AIzaSyTestKey1234567890abcd",
      label: "test-gmail",
      createdBy: "admin@test",
    });
    expect(created.keyLast4).toBe("abcd");
    const pub = listAdminPoolPublic();
    expect(pub.some((s) => s.id === created.id)).toBe(true);
    expect(JSON.stringify(pub)).not.toContain("AIzaSyTestKey");
    const dec = listAdminPoolDecrypted();
    expect(dec.some((s) => s.apiKey.includes("AIzaSyTestKey"))).toBe(true);
    expect(deleteAdminPoolKey(created.id)).toBe(true);
  });

  it("bulk adds provider:key lines", () => {
    process.env.LUGHAWI_ADMIN_POOL_FILE = `${process.cwd()}/.data/test-admin-pool-bulk-${Date.now()}.json`;
    const result = bulkAddAdminPoolKeys({
      text: "google:AIzaBulkKeyAAAAAAAAAAAA\nopenai:sk-bulkkeybbbbbbbbbbbbbb",
      createdBy: "admin@test",
    });
    expect(result.added).toBe(2);
  });
});

describe("quota words", () => {
  it("counts words and defaults monthly quota to 1500", () => {
    expect(countArabicWords("مرحبا بك في عربية")).toBe(4);
    delete process.env.LUGHAWI_MONTHLY_QUOTA_WORDS;
    delete process.env.LUGHAWI_MONTHLY_QUOTA_CHARS;
    expect(lughawiMonthlyQuotaWords()).toBe(1500);
  });
});
