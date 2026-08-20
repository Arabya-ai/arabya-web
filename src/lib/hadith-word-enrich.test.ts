import { describe, expect, it } from "vitest";
import { enrichHadithToken } from "./hadith-word-enrich";

describe("enrichHadithToken", () => {
  it("labels closed-class particles after normalization", async () => {
    const r = await enrichHadithToken("فِي");
    expect(r.matchStatus).toBe("particle");
    expect(r.particleLabelAr).toContain("جر");
    expect(r.source).toBe("arabya-closed-class-particles");
  });

  it("maps inna/anna variants to ان particle", async () => {
    const r = await enrichHadithToken("إِنَّ");
    expect(r.matchStatus).toBe("particle");
    expect(r.matchKind).toBe("closed-class-particle");
  });

  it("enriches common Quran-surface words with morph/sense", async () => {
    const r = await enrichHadithToken("الكتاب");
    expect(r.matchStatus).toBe("exact");
    expect(r.matchKind).toBe("quran-surface-analogy");
    expect(r.root || r.lemma || (r.pos && r.pos.length)).toBeTruthy();
    expect(r.root).toBe("كتب");
  });

  it("enriches bare lemma surfaces from the Quran index", async () => {
    const r = await enrichHadithToken("كتاب");
    expect(r.matchStatus).toBe("exact");
    expect(r.root).toBe("كتب");
  });

  it("fills core hadith glosses for niyya / aʿmāl", async () => {
    const n = await enrichHadithToken("بالنيات");
    expect(n.matchStatus).toBe("gloss");
    expect(n.root).toBe("نوي");
    const a = await enrichHadithToken("الأعمال");
    expect(a.matchStatus).toBe("gloss");
    expect(a.root).toBe("عمل");
  });

  it("strips possessive to reach hijra gloss", async () => {
    const r = await enrichHadithToken("هجرته");
    expect(r.matchStatus).toBe("gloss");
    expect(r.root).toBe("هجر");
  });

  it("returns none for unknown nonce tokens", async () => {
    const r = await enrichHadithToken("زقزلطن");
    expect(r.matchStatus).toBe("none");
  });

  it("strips Arabic comma glued to tokens", async () => {
    const r = await enrichHadithToken("بِالنِّيَّاتِ،");
    expect(r.matchStatus).toBe("gloss");
    expect(r.root).toBe("نوي");
  });

  it("handles empty input", async () => {
    const r = await enrichHadithToken("   ");
    expect(r.matchStatus).toBe("none");
  });
});
