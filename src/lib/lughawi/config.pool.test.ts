import { lughawiProjectAiPool } from "@/lib/lughawi/config";
import { buildAutoCandidates } from "@/lib/lughawi/ai-gateway";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

describe("lughawi multi-key project pool", () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of [
      "LUGHAWI_GOOGLE_API_KEYS",
      "LUGHAWI_OPENAI_API_KEYS",
      "LUGHAWI_PROJECT_AI_POOL",
      "LUGHAWI_GOOGLE_API_KEY",
      "LUGHAWI_OPENAI_API_KEY",
      "LUGHAWI_OLLAMA_BASE_URL",
      "LUGHAWI_PROJECT_AI_POOL_FILE",
    ]) {
      prev[k] = process.env[k];
      delete process.env[k];
    }
    // Avoid reading real Contabo file during tests
    process.env.LUGHAWI_PROJECT_AI_POOL_FILE = "/tmp/arabya-no-pool.json";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("accepts many Google keys from one env var", () => {
    process.env.LUGHAWI_GOOGLE_API_KEYS = "AIzaaaa1111111,AIzabbb2222222,AIzaccc3333333";
    const pool = lughawiProjectAiPool();
    expect(pool.filter((s) => s.provider === "google")).toHaveLength(3);
  });

  it("accepts repeated providers in POOL string", () => {
    process.env.LUGHAWI_PROJECT_AI_POOL =
      "openai:sk-aaaa1111aaaa|openai:sk-bbbb2222bbbb|google:AIzaxxxx99999999";
    const pool = lughawiProjectAiPool();
    expect(pool.filter((s) => s.provider === "openai")).toHaveLength(2);
    expect(pool.some((s) => s.provider === "google")).toBe(true);
  });

  it("adds local ollama slot when base URL set", () => {
    process.env.LUGHAWI_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
    const pool = lughawiProjectAiPool();
    const local = pool.find((s) => s.provider === "ollama");
    expect(local?.baseUrl).toContain("11434");
  });

  it("puts user keys before project keys in Auto", () => {
    process.env.LUGHAWI_GOOGLE_API_KEYS = "AIzaaaa1111111,AIzabbb2222222";
    const list = buildAutoCandidates({
      userCandidates: [
        { provider: "openai", apiKey: "sk-user-zzzzzzzz", source: "user" },
      ],
    });
    expect(list[0]!.source).toBe("user");
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});
