import { buildAutoCandidates, humanizeAiError } from "@/lib/lughawi/ai-gateway";
import { describe, expect, it } from "vitest";

describe("lughawi Auto candidates", () => {
  it("prefers user keys before project and dedupes", () => {
    const list = buildAutoCandidates({
      userCandidates: [
        {
          provider: "openai",
          apiKey: "sk-user-aaaaaaaa",
          source: "user",
        },
      ],
      userOnly: true,
    });
    expect(list).toHaveLength(1);
    expect(list[0]!.source).toBe("user");
  });

  it("orders preferred provider first among user keys", () => {
    const list = buildAutoCandidates({
      userOnly: true,
      preferProvider: "groq",
      userCandidates: [
        { provider: "openai", apiKey: "sk-1xxxxxx1", source: "user" },
        { provider: "groq", apiKey: "gsk-2xxxxxx2", source: "user" },
      ],
    });
    expect(list[0]!.provider).toBe("groq");
  });
});

describe("humanizeAiError", () => {
  it("maps retired Gemini 404 to Arabic without raw JSON", () => {
    const msg = humanizeAiError(
      'Google AI error 404: {"error":{"message":"This model models/gemini-2.0-flash is no longer available"}}',
    );
    expect(msg).toMatch(/Google|Gemini|2\.5/);
    expect(msg).not.toMatch(/\{"error"/);
  });
});
