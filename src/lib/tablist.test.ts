import { describe, expect, it } from "vitest";
import { nextTabIndex } from "@/lib/tablist";

describe("nextTabIndex (RTL roving tablist)", () => {
  const COUNT = 5; // e.g. words, irab, sadi, muyassar, ibn-kathir

  it("ArrowLeft moves to the next tab (RTL) and wraps around", () => {
    expect(nextTabIndex("ArrowLeft", 0, COUNT)).toBe(1);
    expect(nextTabIndex("ArrowLeft", 3, COUNT)).toBe(4);
    expect(nextTabIndex("ArrowLeft", 4, COUNT)).toBe(0);
  });

  it("ArrowRight moves to the previous tab (RTL) and wraps around", () => {
    expect(nextTabIndex("ArrowRight", 4, COUNT)).toBe(3);
    expect(nextTabIndex("ArrowRight", 1, COUNT)).toBe(0);
    expect(nextTabIndex("ArrowRight", 0, COUNT)).toBe(4);
  });

  it("Home jumps to the first tab and End to the last tab", () => {
    expect(nextTabIndex("Home", 3, COUNT)).toBe(0);
    expect(nextTabIndex("End", 0, COUNT)).toBe(COUNT - 1);
  });

  it("ignores unrelated keys", () => {
    expect(nextTabIndex("Enter", 2, COUNT)).toBeNull();
    expect(nextTabIndex("ArrowUp", 2, COUNT)).toBeNull();
    expect(nextTabIndex("a", 2, COUNT)).toBeNull();
  });

  it("returns null when there are no tabs", () => {
    expect(nextTabIndex("ArrowLeft", 0, 0)).toBeNull();
  });

  it("performs a full left-to-right round trip back to the start", () => {
    let i = 0;
    for (let step = 0; step < COUNT; step += 1) {
      i = nextTabIndex("ArrowLeft", i, COUNT) as number;
    }
    expect(i).toBe(0);
  });
});
