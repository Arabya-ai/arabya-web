import { describe, expect, it } from "vitest";
import {
  studioCreateFromAyahHref,
  studioPath,
} from "@/ayat-studio/lib/studio-paths";

describe("studioCreateFromAyahHref", () => {
  it("builds studio new-project URL with ayah + kind", () => {
    expect(
      studioCreateFromAyahHref({ surahId: 2, verse: 255, kind: "video" }),
    ).toBe("/studio/projects/new?s=2&v=255&kind=video&auto=1");
    expect(
      studioCreateFromAyahHref({
        surahId: 1,
        verse: 1,
        kind: "image",
        auto: false,
      }),
    ).toBe("/studio/projects/new?s=1&v=1&kind=image");
  });

  it("clamps invalid surah ids", () => {
    expect(studioCreateFromAyahHref({ surahId: 0, verse: 1 })).toContain(
      "s=1",
    );
    expect(studioCreateFromAyahHref({ surahId: 200, verse: 3 })).toContain(
      "s=114",
    );
  });
});

describe("studioPath", () => {
  it("normalizes legacy /create paths", () => {
    expect(studioPath("/create/projects/new")).toBe("/studio/projects/new");
  });
});
