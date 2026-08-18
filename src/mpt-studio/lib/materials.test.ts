import { describe, expect, it } from "vitest";
import {
  isEngineSampleMaterial,
  isImageMaterial,
  isMoviePyIntermediate,
  materialThumbPath,
  parseMptMaterials,
  preferredLocalMaterials,
} from "@/mpt-studio/lib/materials";

describe("parseMptMaterials", () => {
  it("reads engine file names from the wrapped payload", () => {
    expect(
      parseMptMaterials({
        data: {
          files: [
            { name: "1.png", file: "1.png", size: 12 },
            { name: "../secret", file: "../secret" },
            { name: "clip.mp4", file: "clip.mp4" },
            { name: "1.png.mp4", file: "1.png.mp4" },
          ],
        },
      }),
    ).toEqual([
      { name: "1.png", file: "1.png", size: 12 },
      { name: "clip.mp4", file: "clip.mp4", size: undefined },
    ]);
  });
});

describe("material helpers", () => {
  it("classifies sample stills vs MoviePy intermediates", () => {
    expect(isMoviePyIntermediate("1.png.mp4")).toBe(true);
    expect(isImageMaterial("1.png")).toBe(true);
    expect(isImageMaterial("1.png.mp4")).toBe(false);
    expect(isEngineSampleMaterial("1.png")).toBe(true);
    expect(isEngineSampleMaterial("mosque.mp4")).toBe(false);
    expect(materialThumbPath("1.png")).toBe(
      "/api/studio/ai/materials/thumb?file=1.png",
    );
  });
});

describe("preferredLocalMaterials", () => {
  it("skips png.mp4 intermediates when originals exist", () => {
    const files = preferredLocalMaterials([
      { name: "1.png", file: "1.png" },
      { name: "1.png.mp4", file: "1.png.mp4" },
      { name: "2.png", file: "2.png" },
    ]);
    expect(files.map((item) => item.file)).toEqual(["1.png", "2.png"]);
  });
});
