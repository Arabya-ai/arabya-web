import { describe, expect, it } from "vitest";
import { getIrabClaimsForWord } from "@/lib/irab-claims";
import { makeWordId } from "@/lib/word-id";

describe("irab-claims", () => {
  it("returns QAC claim for Al-Fatiha word 1", async () => {
    const wordId = makeWordId(1, 1, 1);
    const claims = await getIrabClaimsForWord(wordId);
    expect(claims.length).toBeGreaterThanOrEqual(1);
    expect(claims[0]?.sourceId).toBe("qac");
    expect(claims[0]?.text.length).toBeGreaterThan(2);
    expect(claims[0]?.wordId).toBe(wordId);
  });

  it("returns empty for invalid word id", async () => {
    expect(await getIrabClaimsForWord("bad")).toEqual([]);
  });
});
