import ExcelJS from "exceljs";
import { rowsToIrabPayload } from "@/lib/import-book/rows-to-payload";
import type { IrabBookPayload } from "@/lib/import-book/types";

/** Cap spreadsheet/CSV size to reduce ReDoS / memory risk (audit H-01). */
export const MAX_SPREADSHEET_BYTES = 8 * 1024 * 1024;

function assertSize(buffer: Buffer | string, label: string): void {
  const n = typeof buffer === "string" ? Buffer.byteLength(buffer, "utf8") : buffer.length;
  if (n > MAX_SPREADSHEET_BYTES) {
    throw new Error(`${label}_too_large`);
  }
}

function worksheetToRows(
  sheet: ExcelJS.Worksheet,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as Array<ExcelJS.CellValue | undefined>;
    // ExcelJS row.values is 1-indexed (index 0 unused)
    const cells = values.slice(1).map((v) => cellToString(v));
    if (rowNumber === 1) {
      headers = cells.map((h, i) => h || `col_${i + 1}`);
      return;
    }
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    rows.push(obj);
  });

  return rows;
}

function cellToString(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result != null) return String(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text ?? "").join("");
    }
  }
  return String(value);
}

/**
 * Parse .xlsx via ExcelJS (replaces vulnerable SheetJS `xlsx` — audit H-01).
 * Legacy binary `.xls` is not supported; convert to `.xlsx` or CSV first.
 */
export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  meta: { title: string },
): Promise<IrabBookPayload> {
  assertSize(buffer, "spreadsheet");
  const wb = new ExcelJS.Workbook();
  // exceljs typings expect ArrayBuffer-like; Node Buffer is accepted at runtime
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("empty_workbook");
  const rows = worksheetToRows(sheet);
  return rowsToIrabPayload(rows, meta);
}

/** Minimal RFC4180-ish CSV parser — no SheetJS dependency. */
export function parseCsvText(
  csv: string,
  meta: { title: string },
): IrabBookPayload {
  assertSize(csv, "csv");
  const rows = csvToObjects(csv);
  return rowsToIrabPayload(rows, meta);
}

function csvToObjects(csv: string): Record<string, unknown>[] {
  const lines = splitCsvLines(csv);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]!).map((h, i) => h || `col_${i + 1}`);
  const out: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    out.push(obj);
  }
  return out;
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}
