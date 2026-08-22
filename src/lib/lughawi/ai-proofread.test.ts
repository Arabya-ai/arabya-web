import { isUnsafeAiMorphFlip } from "@/lib/lughawi/ai-proofread";
import { collectSpellingEditsOffline } from "@/lib/lughawi/rules/spelling-offline";
import { describe, expect, it } from "vitest";

describe("isUnsafeAiMorphFlip", () => {
  it("blocks ساعد → ساعدت style gender flips", () => {
    expect(isUnsafeAiMorphFlip("ساعد", "ساعدت")).toBe(true);
    expect(isUnsafeAiMorphFlip("كتب", "كتبوا")).toBe(true);
    expect(isUnsafeAiMorphFlip("احمد", "أحمد")).toBe(false);
    expect(isUnsafeAiMorphFlip("على", "علي")).toBe(false);
  });
});

describe("offline name-ali with ساعد", () => {
  it("suggests علي after ساعد for instant L1", () => {
    const edits = collectSpellingEditsOffline("احمد ساعد على في الكتابة", "ar");
    const map = Object.fromEntries(edits.map((e) => [e.original, e.suggestion]));
    expect(map["احمد"]).toBe("أحمد");
    expect(map["على"]).toBe("علي");
  });
});
