import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { rowsToIrabPayload } from "@/lib/import-book/rows-to-payload";
import type { IrabBookPayload } from "@/lib/import-book/types";

const VERSE_HEADING =
  /(?:^|\n)\s*(?:سورة\s*)?(\d{1,3})\s*[:\u060C،]\s*(\d{1,3})\s*(?:[-–—]\s*)?/g;

function parseProseToPayload(
  text: string,
  meta: { title: string },
): IrabBookPayload {
  const verses: IrabBookPayload["verses"] = [];
  const chunks = text.split(VERSE_HEADING).filter(Boolean);

  if (chunks.length >= 3) {
    for (let i = 0; i < chunks.length - 2; i += 3) {
      const surah = Number(chunks[i]);
      const verse = Number(chunks[i + 1]);
      const body = String(chunks[i + 2] || "").trim();
      if (!surah || !verse || !body) continue;
      verses.push({ verseKey: `${surah}:${verse}`, text: body, words: [] });
    }
  }

  if (verses.length === 0) {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(\d{1,3})\s*[:\u060C،]\s*(\d{1,3})\s*[-–—]?\s*(.+)$/);
      if (m) {
        verses.push({
          verseKey: `${Number(m[1])}:${Number(m[2])}`,
          text: m[3]!.trim(),
          words: [],
        });
      }
    }
  }

  if (verses.length === 0) throw new Error("doc_no_verse_structure");

  return {
    meta: { title: meta.title, license: "owner", source: "owner-upload-docx" },
    verses,
  };
}

function htmlTablesToRows(html: string): Record<string, unknown>[] {
  const $ = cheerio.load(html);
  const rows: Record<string, unknown>[] = [];
  $("table").each((_, table) => {
    const headers: string[] = [];
    $(table)
      .find("tr")
      .each((rowIdx, tr) => {
        const cells = $(tr)
          .find("th,td")
          .map((__, td) => $(td).text().trim())
          .get();
        if (cells.length === 0) return;
        if (rowIdx === 0 && $(tr).find("th").length > 0) {
          headers.push(...cells.map((c, i) => c || `col${i + 1}`));
          return;
        }
        const row: Record<string, unknown> = {};
        cells.forEach((cell, i) => {
          row[headers[i] || `col${i + 1}`] = cell;
        });
        rows.push(row);
      });
  });
  return rows;
}

export async function parseDocxBuffer(
  buffer: Buffer,
  meta: { title: string },
): Promise<IrabBookPayload> {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const tableRows = htmlTablesToRows(htmlResult.value);
  if (tableRows.length >= 2) {
    try {
      return rowsToIrabPayload(tableRows, meta);
    } catch {
      /* fall through to prose */
    }
  }

  const textResult = await mammoth.extractRawText({ buffer });
  return parseProseToPayload(textResult.value, meta);
}

export async function parsePdfBuffer(
  buffer: Buffer,
  meta: { title: string },
): Promise<IrabBookPayload> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const text = String(textResult.text || "").replace(/\r/g, "\n");
    return parseProseToPayload(text, meta);
  } finally {
    await parser.destroy();
  }
}
