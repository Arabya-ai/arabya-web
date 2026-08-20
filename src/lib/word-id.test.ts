import { describe, expect, it } from "vitest";
import {
  makeHadithWordId,
  makeHeritageWordId,
  makeWordId,
  parseHadithWordId,
  parseHeritageWordId,
  parseWordId,
} from "./word-id";

describe("word-id", () => {
  it("Quran W: ids", () => {
    expect(makeWordId(1, 1, 1)).toBe("W:001:001:001");
    expect(parseWordId("W:002:255:003")).toEqual({
      surahId: 2,
      verse: 255,
      position: 3,
    });
  });

  it("Hadith HW: ids", () => {
    expect(makeHadithWordId("bukhari", 1, 1)).toBe("HW:bukhari:1:001");
    expect(makeHadithWordId("Musnad Ahmad!", 12, 4)).toBe(
      "HW:musnad-ahmad:12:004",
    );
    expect(parseHadithWordId("HW:nawawi:42:007")).toEqual({
      collection: "nawawi",
      number: 42,
      position: 7,
    });
    expect(parseHadithWordId("W:001:001:001")).toBeNull();
  });

  it("Heritage TW: ids", () => {
    expect(makeHeritageWordId("mutanabbi-samples", 1, 2)).toBe(
      "TW:mutanabbi-samples:1:002",
    );
    expect(parseHeritageWordId("TW:zuhayr:2:001")).toEqual({
      workSlug: "zuhayr",
      passageIndex: 2,
      position: 1,
    });
  });
});
