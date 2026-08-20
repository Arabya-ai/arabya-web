import { describe, expect, it } from "vitest";
import { enrichHadithToken } from "./hadith-word-enrich";

describe("enrichHadithToken", () => {
  it("labels closed-class particles after normalization", async () => {
    const r = await enrichHadithToken("فِي");
    expect(r.matchStatus).toBe("particle");
    expect(r.particleLabelAr).toContain("جر");
    expect(r.translationEn).toBeTruthy();
  });

  it("maps inna/anna variants to ان particle", async () => {
    const r = await enrichHadithToken("إِنَّ");
    expect(r.matchStatus).toBe("particle");
  });

  it("enriches Quran-surface and bare lemmas", async () => {
    const a = await enrichHadithToken("الكتاب");
    expect(a.matchStatus).toBe("exact");
    expect(a.root).toBe("كتب");
    const b = await enrichHadithToken("كتاب");
    expect(b.matchStatus).toBe("exact");
  });

  it("fills core gloss + English translation for niyya / aʿmāl", async () => {
    const n = await enrichHadithToken("بالنيات");
    expect(n.matchStatus).toBe("gloss");
    expect(n.translationEn?.toLowerCase()).toMatch(/intention/);
    const a = await enrichHadithToken("الأعمال");
    expect(a.matchStatus).toBe("gloss");
    expect(a.translationAr).toContain("عمل");
  });

  it("covers common Nawawi/Bukhari vocabulary", async () => {
    for (const w of ["الحلال", "الشبهات", "القلب", "الإيمان", "الصلاة"]) {
      const r = await enrichHadithToken(w);
      expect(r.matchStatus, w).not.toBe("none");
      expect(r.translationAr || r.sense, w).toBeTruthy();
    }
  });

  it("attaches rhetoric for إنما and حدثنا", async () => {
    const r = await enrichHadithToken("إنما");
    expect(r.rhetoricAr).toMatch(/حصر/);
    const h = await enrichHadithToken("حدثنا");
    expect(h.rhetoricAr).toMatch(/إسناد|سند/);
  });

  it("strips possessive and Arabic comma", async () => {
    expect((await enrichHadithToken("هجرته")).root).toBe("هجر");
    expect((await enrichHadithToken("بِالنِّيَّاتِ،")).root).toBe("نوي");
  });

  it("handles empty / unknown", async () => {
    expect((await enrichHadithToken("   ")).matchStatus).toBe("none");
    expect((await enrichHadithToken("زقزلطن")).matchStatus).toBe("none");
  });
});
