import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MUSHAF_TOTAL_PAGES,
  readReadingHabit,
  recordPageRead,
  setDailyGoal,
  todayProgress,
} from "@/lib/reading-habit";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: ls,
    configurable: true,
  });
  return store;
}

describe("reading-habit", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    mockLocalStorage().clear();
  });

  it("starts with default goal and empty progress", () => {
    const state = readReadingHabit();
    expect(state.dailyGoalPages).toBe(2);
    expect(todayProgress(state)).toEqual({ done: 0, goal: 2, met: false });
  });

  it("counts unique pages once per day and updates khatm", () => {
    recordPageRead(10);
    recordPageRead(10);
    const state = recordPageRead(12);
    const progress = todayProgress(state);
    expect(progress.done).toBe(2);
    expect(state.khatmPagesDone).toBe(12);
    expect(state.khatmPagesDone).toBeLessThanOrEqual(MUSHAF_TOTAL_PAGES);
  });

  it("recomputes streak when daily goal is met", () => {
    setDailyGoal(1);
    const state = recordPageRead(3);
    expect(todayProgress(state).met).toBe(true);
    expect(state.streak).toBeGreaterThanOrEqual(1);
  });
});
