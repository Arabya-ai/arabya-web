import { describe, expect, it } from "vitest";
import {
  estimateTokens,
  remainingRatio,
  type SlotUsage,
} from "@/lib/ops/usage-meter";
import { loadIntegrationsRegistry } from "@/lib/ops/integrations";

describe("ops usage meter", () => {
  it("estimates tokens from char length", () => {
    expect(estimateTokens("اب")).toBeGreaterThan(0);
    expect(estimateTokens("أ".repeat(220))).toBeGreaterThanOrEqual(100);
  });

  it("computes remaining ratio", () => {
    const slot: SlotUsage = {
      provider: "google",
      keyTail: "abcd",
      tokensMonth: 250_000,
      requestsMonth: 10,
      failuresMonth: 0,
      budgetTokens: 500_000,
    };
    expect(remainingRatio(slot)).toBeCloseTo(0.5);
  });
});

describe("integrations registry", () => {
  it("loads camel tools and catt entries", () => {
    const reg = loadIntegrationsRegistry();
    expect(reg.integrations.length).toBeGreaterThan(5);
    const ids = reg.integrations.map((i) => i.id);
    expect(ids).toContain("camel-tools");
    expect(ids).toContain("catt");
    expect(ids).toContain("areta");
    expect(ids).toContain("bayan");
  });
});
