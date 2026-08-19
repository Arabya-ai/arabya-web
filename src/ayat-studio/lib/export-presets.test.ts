import { describe, expect, it } from "vitest";
import {
  EXPORT_PRESETS,
  exportPresetLabel,
  qualityToExportPresetId,
  resolveExportPreset,
} from "@/ayat-studio/lib/export-presets";
import type { StoredProject } from "@/ayat-studio/lib/projects-store";

const base = {
  id: "p1",
  title: "t",
  reciterId: "abdulbasit",
  surahId: 1,
  ayahStart: 1,
  ayahEnd: 1,
  ratio: "9:16",
} as StoredProject;

describe("export-presets", () => {
  it("maps legacy quality to preset ids", () => {
    expect(qualityToExportPresetId("standard")).toBe("reels-720");
    expect(qualityToExportPresetId("ultra")).toBe("youtube-4k");
    expect(qualityToExportPresetId("high")).toBe("youtube-1080");
  });

  it("resolves youtube-1080 bitrates by default", () => {
    const preset = resolveExportPreset({
      ...base,
      quality: "high",
      exportPresetId: "youtube-1080",
    });
    expect(preset.videoBitrate).toBe(10_000_000);
    expect(preset.quality).toBe("high");
  });

  it("labels presets in Arabic and English", () => {
    const p = EXPORT_PRESETS[0]!;
    expect(exportPresetLabel(p, "ar")).toContain("720");
    expect(exportPresetLabel(p, "en")).toMatch(/720/i);
  });
});
