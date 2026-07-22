import { describe, expect, it } from "vitest";
import { renderOgCard } from "@/lib/og-card-arabic";

describe("renderOgCard", () => {
  it("renders Arabic PNG with resvg", async () => {
    const res = await renderOgCard({
      eyebrow: "مشاركة آية",
      title: "الفاتحة ١",
      subtitle: "دراسة الآية والإعراب",
      ayahLine: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      footer: "دراسة كلمات القرآن",
    });
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf.length).toBeGreaterThan(5000);
  }, 30000);
});
