import { describe, expect, it } from "vitest";
import {
  MAX_SPREADSHEET_BYTES,
  parseCsvText,
  parseSpreadsheetBuffer,
} from "@/lib/import-book/parse-spreadsheet";

describe("parseCsvText", () => {
  it("maps header row to objects", () => {
    const payload = parseCsvText(
      "surah,ayah,text\n1,1,الحمد\n1,2,رب",
      { title: "اختبار" },
    );
    expect(payload.meta.title).toBe("اختبار");
    expect(payload.verses.length).toBeGreaterThan(0);
  });

  it("rejects oversized CSV", () => {
    const big = "a,b\n" + "x,y\n".repeat(MAX_SPREADSHEET_BYTES);
    expect(() => parseCsvText(big, { title: "x" })).toThrow(/csv_too_large/);
  });
});

describe("parseSpreadsheetBuffer", () => {
  it("parses a minimal xlsx workbook", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Sheet1");
    sheet.addRow(["surah", "ayah", "irab"]);
    sheet.addRow([1, 1, "مبتدأ"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const payload = await parseSpreadsheetBuffer(buf, { title: "كتاب" });
    expect(payload.meta.title).toBe("كتاب");
    expect(payload.verses.length).toBeGreaterThan(0);
  });
});
