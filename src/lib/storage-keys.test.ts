import { describe, expect, it } from "vitest";
import { STORAGE_KEYS, readingHabitPagesKey } from "@/lib/storage-keys";
import {
  editionLangGroupLabel,
  groupVerseEditionsByLang,
} from "@/lib/translation-label";
import type { VerseTranslationEdition } from "@/lib/types";
import { getApiBaseUrl, apiUrl } from "@/lib/api-client";

describe("STORAGE_KEYS", () => {
  it("keeps stable mushaf preference key strings", () => {
    expect(STORAGE_KEYS.mushafFontScale).toBe("arabya-mushaf-font-scale");
    expect(STORAGE_KEYS.lastMushafPage).toBe("arabya-last-mushaf-page");
    expect(STORAGE_KEYS.theme).toBe("arabya-theme");
    expect(STORAGE_KEYS.reciter).toBe("arabya-reciter");
    expect(STORAGE_KEYS.favoriteReciters).toBe("arabya-favorite-reciters");
    expect(STORAGE_KEYS.adhkarProgress).toBe("arabya-adhkar-progress");
    expect(STORAGE_KEYS.prayerCity).toBe("arabya-prayer-city");
    expect(readingHabitPagesKey("2026-07-25")).toBe(
      "arabya-reading-habit:pages:2026-07-25",
    );
  });
});

describe("groupVerseEditionsByLang", () => {
  const editions = [
    {
      slug: "tr-diy",
      resourceId: 1,
      nameAr: "",
      nameEn: "Diyanet",
      nameNative: "Diyanet",
      lang: "tr",
    },
    {
      slug: "en-saheeh",
      resourceId: 2,
      nameAr: "",
      nameEn: "Saheeh",
      nameNative: "Saheeh International",
      lang: "en",
    },
    {
      slug: "id-ind",
      resourceId: 3,
      nameAr: "",
      nameEn: "Indonesian",
      nameNative: "Indonesian",
      lang: "id",
    },
  ] as VerseTranslationEdition[];

  it("groups by lang with preferred order", () => {
    const groups = groupVerseEditionsByLang(editions);
    expect(groups.map((g) => g.lang)).toEqual(["en", "id", "tr"]);
    expect(groups[0].label).toBe(editionLangGroupLabel("en"));
    expect(groups[0].editions).toHaveLength(1);
    expect(groups[0].editions[0].slug).toBe("en-saheeh");
  });
});

describe("api-client", () => {
  it("builds same-origin urls by default", () => {
    expect(getApiBaseUrl()).toBe("");
    expect(apiUrl("/api/tafsir/sadi/1")).toBe("/api/tafsir/sadi/1");
  });
});
