import { describe, expect, it } from "vitest";
import {
  isStudioEditorPath,
  isStudioEditorViewportPath,
} from "@/ayat-studio/lib/studio-shell-mode";

describe("studio shell mode", () => {
  it("detects editor paths only", () => {
    expect(isStudioEditorPath("/studio/editor/abc")).toBe(true);
    expect(isStudioEditorPath("/studio/dashboard")).toBe(false);
    expect(isStudioEditorPath("/studio/projects")).toBe(false);
    expect(isStudioEditorPath("/studio/projects/new")).toBe(false);
    expect(isStudioEditorPath("/studio/settings")).toBe(false);
  });

  it("locks viewport only on editor", () => {
    expect(isStudioEditorViewportPath("/studio/editor/x")).toBe(true);
    expect(isStudioEditorViewportPath("/studio/dashboard")).toBe(false);
    expect(isStudioEditorViewportPath("/studio")).toBe(false);
  });
});
