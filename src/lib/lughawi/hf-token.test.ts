import { afterEach, describe, expect, it } from "vitest";
import { hfMoaReady, resolveHfTokenForMoa } from "@/lib/lughawi/hf-token";

describe("hf-token", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("reads LUGHAWI_HF_TOKEN from env", () => {
    process.env.LUGHAWI_HF_TOKEN = "hf_test_secret";
    expect(resolveHfTokenForMoa()).toBe("hf_test_secret");
    expect(hfMoaReady()).toBe(true);
  });

  it("returns empty when no env or pool", () => {
    delete process.env.LUGHAWI_HF_TOKEN;
    delete process.env.HF_TOKEN;
    expect(resolveHfTokenForMoa()).toBe("");
    expect(hfMoaReady()).toBe(false);
  });
});
