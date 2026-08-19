/** Render page 1 of a PDF as a PNG thumbnail (portrait, full page visible). */
export async function generatePdfCoverThumbnail(
  pdfBuffer: Buffer,
  opts: { width?: number } = {},
): Promise<Buffer | null> {
  const width = opts.width ?? 480;
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const shot = await parser.getScreenshot({
        partial: [1],
        desiredWidth: width,
        imageBuffer: true,
      });
      const page = shot.pages?.[0];
      if (!page?.data?.length) return null;
      return Buffer.from(page.data);
    } finally {
      await parser.destroy();
    }
  } catch {
    return null;
  }
}

export function libraryCoverFileName(): string {
  return "cover.png";
}
