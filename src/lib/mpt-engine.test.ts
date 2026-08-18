import { afterEach, describe, expect, it } from "vitest";
import {
  getMptApiBase,
  isAllowedMptApiPath,
  isSafeMptFilePath,
  joinMptUrl,
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
});
