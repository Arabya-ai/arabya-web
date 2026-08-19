import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "theme.css"), "utf8");

describe("studio sidebar contrast", () => {
  it("forces on-brand labels on the dark teal panel", () => {
    expect(css).toContain(".ayat-studio .studio-app-sidebar a");
    expect(css).toContain(".studio-app-sidebar__item-label");
    expect(css).toContain("-webkit-text-fill-color: var(--on-brand) !important");
    expect(css).toContain("color: var(--on-brand) !important");
  });
});
