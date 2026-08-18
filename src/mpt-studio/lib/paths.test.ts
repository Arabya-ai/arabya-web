import { describe, expect, it } from "vitest";
import { isMptStudioPath, mptStudioPath } from "@/mpt-studio/lib/paths";

describe("mptStudioPath", () => {
  it("keeps AI routes under /studio/ai", () => {
    expect(mptStudioPath()).toBe("/studio/ai");
    expect(mptStudioPath("/create")).toBe("/studio/ai/create");
    expect(mptStudioPath("/studio/ai/tasks")).toBe("/studio/ai/tasks");
  });

  it("does not collide with ayah studio editor paths", () => {
    expect(isMptStudioPath("/studio/ai")).toBe(true);
    expect(isMptStudioPath("/studio/editor/x")).toBe(false);
    expect(isMptStudioPath("/studio/dashboard")).toBe(false);
  });
});
