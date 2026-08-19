import { describe, expect, it } from "vitest";
import { coverUrlForWork } from "@/lib/library/covers";
import { getLibraryCatalog, getLibraryWork } from "@/lib/library";
import { generatePdfCoverThumbnail } from "@/lib/library/pdf-cover";
import { readFile } from "node:fs/promises";
import path from "node:path";

describe("library catalog", () => {
  it("lists seeded educational books", async () => {
    const works = await getLibraryCatalog();
    expect(works.some((w) => w.id === "al-mukhtasar-al-nahw")).toBe(true);
  });

  it("loads work metadata with pdf url and cover", async () => {
    const work = await getLibraryWork("al-mukhtasar-al-nahw");
    expect(work?.title).toContain("المختصر");
    expect(work?.pdfUrl).toContain(".pdf");
    expect(work?.coverUrl).toBe("/media/library/covers/al-mukhtasar-al-nahw.png");
    expect(work?.pageCount).toBe(66);
  });
});

describe("pdf cover thumbnail", () => {
  it("renders first page without throwing", async () => {
    const pdfPath = path.join(
      process.cwd(),
      "public/media/library/al-mukhtasar-al-nahw.pdf",
    );
    const pdf = await readFile(pdfPath);
    const png = await generatePdfCoverThumbnail(pdf);
    expect(png).not.toBeNull();
    expect(png!.length).toBeGreaterThan(10_000);
  });

  it("resolves git cover path", () => {
    expect(
      coverUrlForWork({ id: "al-mukhtasar-al-nahw", coverUrl: undefined }),
    ).toBe("/media/library/covers/al-mukhtasar-al-nahw.png");
  });
});
