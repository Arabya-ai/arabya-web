import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getMptApiBase,
  isAllowedMptApiPath,
  isSafeMaterialFilename,
  isSafeMptFilePath,
  joinMptUrl,
  mptMaterialImageContentType,
  resolveMptLocalVideoFile,
  rewriteMptValue,
} from "@/lib/mpt-engine";

describe("getMptApiBase", () => {
  const prev = process.env.MONEYPRINTER_API_URL;
  afterEach(() => {
    if (prev === undefined) delete process.env.MONEYPRINTER_API_URL;
    else process.env.MONEYPRINTER_API_URL = prev;
  });

  it("returns origin for http(s) URLs", () => {
    process.env.MONEYPRINTER_API_URL = "http://127.0.0.1:8080/docs";
    expect(getMptApiBase()).toBe("http://127.0.0.1:8080");
  });

  it("rejects credentials and unknown protocols", () => {
    process.env.MONEYPRINTER_API_URL = "http://user:pass@127.0.0.1:8080";
    expect(getMptApiBase()).toBeNull();
    process.env.MONEYPRINTER_API_URL = "file:///etc/passwd";
    expect(getMptApiBase()).toBeNull();
  });
});

describe("joinMptUrl", () => {
  it("stays on the engine origin", () => {
    const url = joinMptUrl("http://127.0.0.1:8080", "/api/v1/tasks?page=1");
    expect(url.origin).toBe("http://127.0.0.1:8080");
    expect(url.pathname).toBe("/api/v1/tasks");
  });

  it("rejects traversal and protocol-relative paths", () => {
    expect(() => joinMptUrl("http://127.0.0.1:8080", "/api/v1/../secret")).toThrow();
    expect(() => joinMptUrl("http://127.0.0.1:8080", "//evil.test/x")).toThrow();
    expect(() => joinMptUrl("http://127.0.0.1:8080", "https://evil.test")).toThrow();
  });
});

describe("isAllowedMptApiPath", () => {
  it("allows the documented v1 surface only", () => {
    expect(isAllowedMptApiPath("/api/v1/videos")).toBe(true);
    expect(isAllowedMptApiPath("/api/v1/video_materials")).toBe(true);
    expect(isAllowedMptApiPath("/api/v1/tasks/abc-123")).toBe(true);
    expect(isAllowedMptApiPath("/api/v1/config")).toBe(false);
    expect(isAllowedMptApiPath("/ping")).toBe(false);
  });
});

describe("isSafeMptFilePath", () => {
  it("allows task id + filename", () => {
    expect(isSafeMptFilePath(["abc-1", "final-1.mp4"])).toBe(true);
    expect(isSafeMptFilePath(["..", "final.mp4"])).toBe(false);
    expect(isSafeMptFilePath(["abc", "foo/bar"])).toBe(false);
  });
});

describe("rewriteMptValue", () => {
  it("rewrites engine task URLs to the Arabya proxy", () => {
    const rewritten = rewriteMptValue({
      videos: [
        "http://127.0.0.1:8080/tasks/abc/final-1.mp4",
        "/tasks/abc/final-2.mp4",
      ],
      note: "keep",
    }) as { videos: string[]; note: string };
    expect(rewritten.videos[0]).toBe("/api/studio/ai/files/abc/final-1.mp4");
    expect(rewritten.videos[1]).toBe("/api/studio/ai/files/abc/final-2.mp4");
    expect(rewritten.note).toBe("keep");
  });

  it("rewrites engine filesystem task paths without leaking the host path", () => {
    expect(
      rewriteMptValue(
        "/workspace/services/money-printer-turbo/storage/tasks/abc/final-1.mp4",
      ),
    ).toBe("/api/studio/ai/files/abc/final-1.mp4");
  });
});

describe("local material files", () => {
  const prevDir = process.env.MPT_LOCAL_VIDEOS_DIR;

  afterEach(() => {
    if (prevDir === undefined) delete process.env.MPT_LOCAL_VIDEOS_DIR;
    else process.env.MPT_LOCAL_VIDEOS_DIR = prevDir;
  });

  it("accepts basenames and image types only", () => {
    expect(isSafeMaterialFilename("1.png")).toBe(true);
    expect(isSafeMaterialFilename("../secret.png")).toBe(false);
    expect(mptMaterialImageContentType("1.png")).toBe("image/png");
    expect(mptMaterialImageContentType("1.png.mp4")).toBeNull();
  });

  it("resolves files inside the configured folder only", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mpt-local-"));
    process.env.MPT_LOCAL_VIDEOS_DIR = dir;
    expect(resolveMptLocalVideoFile("1.png")).toBe(path.join(dir, "1.png"));
    expect(resolveMptLocalVideoFile("../secret.png")).toBeNull();
    expect(resolveMptLocalVideoFile("sub/a.png")).toBeNull();
  });
});
