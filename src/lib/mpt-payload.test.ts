import { describe, expect, it } from "vitest";
import {
  fallbackStockTerms,
  isSafeTaskId,
  parseMptScriptBody,
  parseMptTermsBody,
  parseMptVideoBody,
} from "@/lib/mpt-payload";

describe("parseMptVideoBody", () => {
  it("requires a subject and fills safe defaults", () => {
    expect(parseMptVideoBody({}).ok).toBe(false);
    const parsed = parseMptVideoBody({ video_subject: "أثر الصدقة" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.body.video_aspect).toBe("9:16");
    expect(parsed.body.video_language).toBe("Arabic");
    expect(parsed.body.voice_name).toContain("ar-SA");
    expect(parsed.body.video_source).toBe("pexels");
    expect(parsed.body.video_terms).toContain("mosque");
  });

  it("requires local materials when source is local", () => {
    expect(
      parseMptVideoBody({ video_subject: "topic", video_source: "local" }).ok,
    ).toBe(false);
    const parsed = parseMptVideoBody({
      video_subject: "topic",
      video_source: "local",
      video_materials: [{ url: "clip-1.png" }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.body.video_materials).toEqual([
      { provider: "local", url: "clip-1.png" },
    ]);
    expect(
      parseMptVideoBody({
        video_subject: "topic",
        video_source: "local",
        video_materials: [{ url: "1.png" }, { url: "1.png.mp4" }],
      }).ok,
    ).toBe(false);
  });

  it("rejects non-hex colors and clamps counts", () => {
    expect(
      parseMptVideoBody({
        video_subject: "topic",
        text_fore_color: "red",
      }).ok,
    ).toBe(false);
    const parsed = parseMptVideoBody({
      video_subject: "topic",
      video_count: 99,
      video_clip_duration: 1,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.body.video_count).toBe(3);
    expect(parsed.body.video_clip_duration).toBe(2);
  });
});

describe("parseMptScriptBody / terms", () => {
  it("validates script generation input", () => {
    expect(parseMptScriptBody({ video_subject: "أ" }).ok).toBe(false);
    expect(parseMptScriptBody({ video_subject: "موضوع كافٍ" }).ok).toBe(true);
    expect(
      parseMptTermsBody({ video_subject: "t", video_script: "short" }).ok,
    ).toBe(false);
    expect(
      parseMptTermsBody({
        video_subject: "topic",
        video_script: "a long enough script text",
      }).ok,
    ).toBe(true);
  });
});

describe("isSafeTaskId", () => {
  it("accepts uuid-like ids only", () => {
    expect(isSafeTaskId("6c85c8cc-a77a-42b9-bc30-947815aa0558")).toBe(true);
    expect(isSafeTaskId("../etc/passwd")).toBe(false);
    expect(isSafeTaskId("ab")).toBe(false);
  });
});

describe("fallbackStockTerms", () => {
  it("keeps English words and falls back for Arabic-only text", () => {
    expect(fallbackStockTerms("charity in the mosque")).toContain("charity");
    expect(fallbackStockTerms("أثر الصدقة")).toContain("mosque");
  });
});
