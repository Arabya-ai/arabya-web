import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetFlywheelDbForTests } from "@/lib/lughawi/flywheel-db";
import {
  learningStats,
  listRecentAcceptedCorrections,
  lookupExactLearnedCorrection,
  recordFeedback,
} from "@/lib/lughawi/learning-store";

describe("lughawi flywheel sqlite L2", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lughawi-fw-"));
    process.env.LUGHAWI_FLYWHEEL_DB = join(dir, "flywheel.sqlite");
    process.env.LUGHAWI_WRITE_GIT_SEED = "0";
    resetFlywheelDbForTests();
  });

  afterEach(() => {
    resetFlywheelDbForTests();
    rmSync(dir, { recursive: true, force: true });
    delete process.env.LUGHAWI_FLYWHEEL_DB;
  });

  it("records feedback events and activates after enough accepts", () => {
    for (let i = 0; i < 5; i++) {
      recordFeedback({
        from: "احمد",
        to: "أحمد",
        decision: "accepted",
        ruleId: "name-hamza",
        tier: "client",
        userEmail: "tester@example.com",
      });
    }
    const stats = learningStats();
    expect(stats.backend).toBe("sqlite");
    expect(stats.events).toBe(5);
    expect(stats.active).toBeGreaterThanOrEqual(1);
    const recent = listRecentAcceptedCorrections(3);
    expect(recent[0]?.to).toBe("أحمد");
    expect(lookupExactLearnedCorrection("احمد")).toBe("أحمد");
  });

  it("custom decision rejects model pair and accepts user pair", () => {
    recordFeedback({
      from: "بقره",
      to: "بقرة",
      decision: "custom",
      customTo: "بَقرة",
      tier: "client",
    });
    const stats = learningStats();
    expect(stats.events).toBe(1);
    expect(lookupExactLearnedCorrection("بقره")).toBeNull();
  });
});
