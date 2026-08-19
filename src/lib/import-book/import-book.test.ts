import { describe, expect, it } from "vitest";
import {
  countPayloadStats,
  rowsToIrabPayload,
} from "@/lib/import-book/rows-to-payload";
import { slugifyBookTitle } from "@/lib/import-book/slug";
import { googleSheetCsvExportUrl } from "@/lib/import-book/parse-upload";

describe("import-book helpers", () => {
  it("slugifies Arabic/English titles", () => {
    expect(slugifyBookTitle("كتابي").length).toBeGreaterThan(1);
    expect(slugifyBookTitle("My Book")).toBe("my-book");
  });

  it("parses spreadsheet rows to verses", () => {
    const payload = rowsToIrabPayload(
      [
        {
          surah: "1",
          verse: "1",
          wordId: "W:001:001:001",
          irab: "جار ومجرور",
        },
        {
          سورة: "1",
          آية: "1",
          wordId: "W:001:001:002",
          إعراب: "لفظ الجلالة",
        },
      ],
      { title: "Test" },
    );
    expect(payload.verses).toHaveLength(1);
    expect(payload.verses[0]?.words).toHaveLength(2);
    const stats = countPayloadStats(payload);
    expect(stats.wordCount).toBe(2);
  });

  it("builds google sheet export url", () => {
    const url = googleSheetCsvExportUrl(
      "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0",
    );
    expect(url).toContain("abc123");
    expect(url).toContain("format=csv");
  });
});
