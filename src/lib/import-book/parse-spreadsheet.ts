import * as XLSX from "xlsx";
import { rowsToIrabPayload } from "@/lib/import-book/rows-to-payload";
import type { IrabBookPayload } from "@/lib/import-book/types";

export function parseSpreadsheetBuffer(
  buffer: Buffer,
  meta: { title: string },
): IrabBookPayload {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("empty_workbook");
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error("empty_sheet");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rowsToIrabPayload(rows, meta);
}

export function parseCsvText(
  csv: string,
  meta: { title: string },
): IrabBookPayload {
  const wb = XLSX.read(csv, { type: "string" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("empty_csv");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName]!,
    { defval: "", raw: false },
  );
  return rowsToIrabPayload(rows, meta);
}
