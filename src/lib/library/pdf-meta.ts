/** Extract page count from a PDF buffer (best-effort). */
export async function countPdfPages(buffer: Buffer): Promise<number | undefined> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      const n = Number(info?.total ?? 0);
      return n > 0 ? n : undefined;
    } finally {
      await parser.destroy();
    }
  } catch {
    return undefined;
  }
}
