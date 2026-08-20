import { describe, expect, it } from "vitest";
import { libraryCategoryLabel, normalizeLibraryCategory } from "@/lib/library/categories";

describe("library categories", () => {
  it("keeps custom category ids instead of collapsing to education", () => {
    expect(normalizeLibraryCategory("fiqh")).toBe("fiqh");
    expect(normalizeLibraryCategory("")).toBe("education");
  });

  it("labels custom categories from extras", () => {
    const extras = [{ id: "fiqh", labelAr: "الفقه", labelEn: "Fiqh" }];
    expect(libraryCategoryLabel("fiqh", "ar", extras)).toBe("الفقه");
    expect(libraryCategoryLabel("fiqh", "en", extras)).toBe("Fiqh");
  });
});
