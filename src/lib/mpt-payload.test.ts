import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isSafeTaskId,
  MPT_SOURCES,
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
  });

  it("does not offer a local engine-folder source", () => {
    expect(MPT_SOURCES).toEqual(["pexels", "pixabay", "coverr"]);
    const createPage = readFileSync(
      resolve(__dirname, "../mpt-studio/pages/AiCreate.tsx"),
      "utf8",
    );
    expect(createPage).not.toContain("local_videos");
    expect(createPage).not.toContain("source_local");
  });

  it("maps a legacy local source to Pexels and drops folder files", () => {
    const parsed = parseMptVideoBody({
      video_subject: "topic",
      video_source: "local",
      video_materials: [{ url: "1.png" }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.body.video_source).toBe("pexels");
    expect(parsed.body).not.toHaveProperty("video_materials");
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
