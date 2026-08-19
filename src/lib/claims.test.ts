import { describe, expect, it } from "vitest";
import {
  claimFromQacIrab,
  claimsHaveAlternates,
  listIrabSources,
  QAC_IRAB_SOURCE,
  type IrabSourceMeta,
} from "@/lib/claims";

describe("claims", () => {
  it("lists QAC first then book catalog", () => {
    const book: IrabSourceMeta = {
      id: "darwish",
      label: "درويش",
      status: "ready",
    };
    const sources = listIrabSources([book]);
    expect(sources[0]?.id).toBe("qac");
    expect(sources[1]?.id).toBe("darwish");
  });

  it("builds QAC syntax claim with provenance", () => {
    const claim = claimFromQacIrab("W:001:001:001", "جار ومجرور", "جار");
    expect(claim.id).toBe("claim:W:001:001:001:syntax:qac");
    expect(claim.layer).toBe("syntax");
    expect(claim.sourceId).toBe(QAC_IRAB_SOURCE.id);
    expect(claim.scope).toBe("word");
    expect(claim.wordId).toBe("W:001:001:001");
    expect(claim.evidence).toBe("جار");
    expect(claim.confidence).toBe("high");
  });

  it("detects alternate claim texts", () => {
    const a = claimFromQacIrab("W:001:001:001", "أ");
    const b = claimFromQacIrab("W:001:001:001", "ب");
    b.sourceId = "darwish";
    b.id = "claim:W:001:001:001:syntax:darwish";
    expect(claimsHaveAlternates([a])).toBe(false);
    expect(claimsHaveAlternates([a, { ...a }])).toBe(false);
    expect(claimsHaveAlternates([a, b])).toBe(true);
  });
});
