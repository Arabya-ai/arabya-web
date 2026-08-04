import { describe, expect, it } from "vitest";
import {
  applyCreditPlaceholders,
  creditForLocale,
  normalizeSiteAppearance,
  sanitizeCredit,
} from "@/lib/site-appearance";

describe("site-appearance", () => {
  it("sanitizes and truncates credit text", () => {
    expect(sanitizeCredit("  hello   world  ", "fb")).toBe("hello world");
    expect(sanitizeCredit("", "fb")).toBe("fb");
    expect(sanitizeCredit("x".repeat(300), "fb").length).toBe(240);
  });

  it("normalizes partial payloads", () => {
    const n = normalizeSiteAppearance({
      footerCreditAr: "© {year} عربية",
    });
    expect(n.footerCreditAr).toBe("© {year} عربية");
    expect(n.footerCreditEn).toContain("Arabya");
  });

  it("applies year placeholder per locale", () => {
    expect(applyCreditPlaceholders("© {year} X", 2026)).toBe("© 2026 X");
    const appearance = normalizeSiteAppearance({
      footerCreditAr: "عربية {year}",
      footerCreditEn: "Arabya {year}",
    });
    expect(creditForLocale(appearance, "ar", 2026)).toBe("عربية 2026");
    expect(creditForLocale(appearance, "en", 2026)).toBe("Arabya 2026");
  });
});
