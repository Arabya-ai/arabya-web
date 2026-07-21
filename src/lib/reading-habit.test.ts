import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MUSHAF_TOTAL_PAGES,
  readReadingHabit,
  recordPageRead,
  resetReadingHabit,
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
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
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
    resetReadingHabit();
  });

  afterEach(() => {
    mockLocalStorage().clear();
  });

  it("starts with default goal and empty progress", () => {
    const state = readReadingHabit();
    expect(state.dailyGoalPages).toBe(2);
    expect(todayProgress(state)).toEqual({ done: 0, goal: 2, met: false });
  });

  it("counts unique pages once per day and unique pages for khatm", () => {
    recordPageRead(10);
    recordPageRead(10);
    const state = recordPageRead(12);
    const progress = todayProgress(state);
    expect(progress.done).toBe(2);
    expect(state.khatmPagesDone).toBe(2);
    expect(state.khatmPagesDone).toBeLessThanOrEqual(MUSHAF_TOTAL_PAGES);
  });

  it("never double-counts the same page even with string coercion", () => {
    recordPageRead(1);
    recordPageRead(1);
    recordPageRead(Number("1"));
    // @ts-expect-error intentional coercion case from storage/UI
    recordPageRead("1");
    const state = readReadingHabit();
    expect(todayProgress(state).done).toBe(1);
    expect(state.khatmPagesDone).toBe(1);
  });

  it("does not treat a high page number as full khatm", () => {
    const state = recordPageRead(604);
    expect(state.khatmPagesDone).toBe(1);
    expect(todayProgress(state).done).toBe(1);
  });

  it("recomputes streak when daily goal is met", () => {
    setDailyGoal(1);
    const state = recordPageRead(3);
    expect(todayProgress(state).met).toBe(true);
    expect(state.streak).toBeGreaterThanOrEqual(1);
  });

  it("resets to defaults", () => {
    setDailyGoal(5);
    recordPageRead(1);
    recordPageRead(2);
    const cleared = resetReadingHabit();
    expect(cleared.dailyGoalPages).toBe(2);
    expect(cleared.streak).toBe(0);
    expect(cleared.khatmPagesDone).toBe(0);
    expect(todayProgress(cleared).done).toBe(0);
  });
});
