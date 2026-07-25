import { beforeEach, describe, expect, it, vi } from "vitest";
import { missingCacheKeys } from "@/hooks/useMushafStudyCache";
import { apiGet, apiUrl, getApiBaseUrl } from "@/lib/api-client";

describe("api-client paths used by study cache", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds relative tafsir URLs for same-origin web", () => {
    expect(getApiBaseUrl()).toBe("");
    expect(apiUrl("/api/tafsir/sadi/1")).toBe("/api/tafsir/sadi/1");
  });

  it("skips refetch when cache already has a key (including null)", () => {
    expect(
      missingCacheKeys([1, 2], { "sadi:1": { id: 1 }, "sadi:2": null }, "sadi"),
    ).toEqual([]);
  });

  it("apiGet forwards to fetch with the resolved URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiGet("/api/tafsir/sadi/1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tafsir/sadi/1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.ok).toBe(true);
  });
});
