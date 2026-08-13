import { describe, expect, it } from "vitest";
import {
  layerKey,
  resolveLayerText,
  STUDIO_LAYER_TEXT_MAX_CHARS,
} from "@/ayat-studio/lib/studio-layers";

describe("studio-layers helpers", () => {
  it("resolves override over map", () => {
    expect(
      resolveLayerText({ 1: "from-map" }, { "2:1": "override" }, 2, 1),
    ).toBe("override");
    expect(resolveLayerText({ 1: "from-map" }, undefined, 2, 1)).toBe(
      "from-map",
    );
  });

  it("builds layer keys", () => {
    expect(layerKey(2, 255)).toBe("2:255");
  });

  it("keeps a studio text cap for heavy tafsirs", () => {
    expect(STUDIO_LAYER_TEXT_MAX_CHARS).toBe(2000);
  });
});
