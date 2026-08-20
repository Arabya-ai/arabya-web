import { describe, expect, it } from "vitest";
import { collapseDuplicatePathSlashes } from "@/lib/path-normalize";

describe("collapseDuplicatePathSlashes", () => {
  it("normalizes //lughawi to /lughawi", () => {
    expect(collapseDuplicatePathSlashes("//lughawi")).toBe("/lughawi");
    expect(collapseDuplicatePathSlashes("///lughawi")).toBe("/lughawi");
    expect(collapseDuplicatePathSlashes("//en//lughawi")).toBe("/en/lughawi");
  });

  it("leaves clean paths unchanged", () => {
    expect(collapseDuplicatePathSlashes("/lughawi")).toBe("/lughawi");
    expect(collapseDuplicatePathSlashes("/")).toBe("/");
  });
});
