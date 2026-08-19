import { describe, expect, it } from "vitest";
import { getLibraryCatalog, getLibraryWork } from "@/lib/library";

describe("library catalog", () => {
  it("lists seeded educational books", async () => {
    const works = await getLibraryCatalog();
    expect(works.some((w) => w.id === "al-mukhtasar-al-nahw")).toBe(true);
  });

  it("loads work metadata with pdf url", async () => {
    const work = await getLibraryWork("al-mukhtasar-al-nahw");
    expect(work?.title).toContain("المختصر");
    expect(work?.pdfUrl).toBe("/media/library/al-mukhtasar-al-nahw.pdf");
    expect(work?.pageCount).toBe(66);
  });
});
