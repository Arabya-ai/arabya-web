import { describe, expect, it } from "vitest";
import { sanitizeAdhkarMap, sanitizeTasbeehState } from "@/lib/adhkar-sync";

describe("sanitizeAdhkarMap", () => {
  it("keeps valid ids, drops prototype and invalid keys, caps counts", () => {
    const raw = JSON.parse(
      '{"morning-1":3,"__proto__":{"x":1},"constructor":2,"bad key":4,"ok-id":1000000000}',
    ) as Record<string, unknown>;
    expect(sanitizeAdhkarMap(raw)).toEqual({
      "morning-1": 3,
      "ok-id": 1_000_000,
    });
  });

  it("rejects arrays and non-objects", () => {
    expect(sanitizeAdhkarMap([1, 2])).toEqual({});
    expect(sanitizeAdhkarMap(null)).toEqual({});
    expect(sanitizeAdhkarMap("nope")).toEqual({});
  });
});

describe("sanitizeTasbeehState", () => {
  it("falls back on bad phrase ids and negative counts", () => {
    expect(sanitizeTasbeehState({ phraseId: "<script>", count: -3 })).toEqual({
      phraseId: "subhanallah",
      count: 0,
    });
    expect(
      sanitizeTasbeehState({ phraseId: "alhamdulillah", count: 12.9 }),
    ).toEqual({
      phraseId: "alhamdulillah",
      count: 12,
    });
  });
});
