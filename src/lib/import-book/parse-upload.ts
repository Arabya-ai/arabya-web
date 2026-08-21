import { parseCsvText, parseSpreadsheetBuffer } from "@/lib/import-book/parse-spreadsheet";
import { parseDocxBuffer, parsePdfBuffer } from "@/lib/import-book/parse-document";
import type { ImportSourceKind, IrabBookPayload } from "@/lib/import-book/types";

export function detectKindFromFilename(filename: string): ImportSourceKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
}

export function googleSheetCsvExportUrl(url: string): string | null {
  const trimmed = url.trim();
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

export async function parseUploadToPayload(input: {
  buffer: Buffer;
  filename: string;
  title: string;
  kind?: ImportSourceKind;
}): Promise<{ payload: IrabBookPayload; kind: ImportSourceKind }> {
  const kind = input.kind ?? detectKindFromFilename(input.filename);
  if (!kind) throw new Error("unsupported_file_type");

  const meta = { title: input.title };

  if (kind === "json") {
    const raw = JSON.parse(input.buffer.toString("utf8")) as IrabBookPayload;
    if (!raw?.verses?.length) throw new Error("invalid_json");
    if (!raw.meta?.title) raw.meta = { ...raw.meta, title: input.title };
    return { payload: raw, kind };
  }

  if (kind === "csv") {
    return {
      payload: parseCsvText(input.buffer.toString("utf8"), meta),
      kind,
    };
  }

  if (kind === "xlsx") {
    if (input.filename.toLowerCase().endsWith(".xls") && !input.filename.toLowerCase().endsWith(".xlsx")) {
      throw new Error("xls_not_supported_use_xlsx_or_csv");
    }
    return { payload: await parseSpreadsheetBuffer(input.buffer, meta), kind };
  }

  if (kind === "docx") {
    return { payload: await parseDocxBuffer(input.buffer, meta), kind: "docx" };
  }

  if (kind === "pdf") {
    return { payload: await parsePdfBuffer(input.buffer, meta), kind: "pdf" };
  }

  throw new Error("unsupported_file_type");
}

export async function fetchGoogleSheetPayload(
  sheetUrl: string,
  title: string,
): Promise<{ payload: IrabBookPayload; kind: ImportSourceKind }> {
  const exportUrl = googleSheetCsvExportUrl(sheetUrl);
  if (!exportUrl) throw new Error("invalid_google_sheet_url");
  const res = await fetch(exportUrl, {
    headers: { Accept: "text/csv" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("google_sheet_fetch_failed");
  const csv = await res.text();
  return {
    payload: parseCsvText(csv, { title }),
    kind: "google_sheet",
  };
}
