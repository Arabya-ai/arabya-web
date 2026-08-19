import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/irab/claims/route";
import { makeWordId } from "@/lib/word-id";

describe("GET /api/irab/claims", () => {
  it("returns 400 for invalid wordId", async () => {
    const res = await GET(new Request("http://local/api/irab/claims?wordId=x"));
    expect(res.status).toBe(400);
  });

  it("returns QAC claims for a known word", async () => {
    const wordId = makeWordId(1, 1, 1);
    const res = await GET(
      new Request(`http://local/api/irab/claims?wordId=${encodeURIComponent(wordId)}`),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok?: boolean;
      claims?: { sourceId: string }[];
    };
    expect(data.ok).toBe(true);
    expect(data.claims?.[0]?.sourceId).toBe("qac");
  });

  it("returns ayah bundle", async () => {
    const res = await GET(
      new Request("http://local/api/irab/claims?surah=1&verse=1"),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok?: boolean;
      words?: Record<string, unknown[]>;
    };
    expect(data.ok).toBe(true);
    expect(Object.keys(data.words ?? {}).length).toBeGreaterThan(0);
  });
});
