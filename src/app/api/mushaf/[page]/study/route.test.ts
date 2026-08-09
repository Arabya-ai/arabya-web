import { describe, expect, it } from "vitest";
import { GET as getMushafStudy } from "@/app/api/mushaf/[page]/study/route";

describe("GET /api/mushaf/[page]/study", () => {
  it("rejects invalid page numbers", async () => {
    const res = await getMushafStudy(new Request("http://localhost/api/mushaf/0/study"), {
      params: Promise.resolve({ page: "0" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns sliced irab/senses for page 1", async () => {
    const res = await getMushafStudy(
      new Request("http://localhost/api/mushaf/1/study"),
      { params: Promise.resolve({ page: "1" }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      irabBySurah: Record<string, { verses: unknown[] } | null>;
      sensesBySurah: Record<string, unknown>;
      lexiconByKey: Record<string, string>;
    };
    expect(Object.keys(body.irabBySurah).length).toBeGreaterThan(0);
    expect(body.irabBySurah["1"]?.verses?.length).toBeGreaterThan(0);
    expect(typeof body.lexiconByKey).toBe("object");
  });
});
