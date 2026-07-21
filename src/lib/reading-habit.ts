/** Local reading habit: daily goal, streak, simple khatm planner (localStorage). */

export type ReadingHabitState = {
  /** Target mushaf pages per calendar day */
  dailyGoalPages: number;
  /** YYYY-MM-DD → pages completed that day */
  days: Record<string, number>;
  streak: number;
  /** Optional khatm: pages done toward 604 */
  khatmPagesDone: number;
  lastVisitDate: string | null;
};

const KEY = "arabya-reading-habit";
const TOTAL_PAGES = 604;

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyState(): ReadingHabitState {
  return {
    dailyGoalPages: 2,
    days: {},
    streak: 0,
    khatmPagesDone: 0,
    lastVisitDate: null,
  };
}

export function readReadingHabit(): ReadingHabitState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<ReadingHabitState>;
    return {
      ...emptyState(),
      ...parsed,
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      dailyGoalPages: Math.min(
        30,
        Math.max(1, Number(parsed.dailyGoalPages) || 2),
      ),
      streak: Math.max(0, Number(parsed.streak) || 0),
      khatmPagesDone: Math.min(
        TOTAL_PAGES,
        Math.max(0, Number(parsed.khatmPagesDone) || 0),
      ),
    };
  } catch {
    return emptyState();
  }
}

export function writeReadingHabit(state: ReadingHabitState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function prevDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function recomputeStreak(days: Record<string, number>, goal: number): number {
  let streak = 0;
  let cursor = todayKey();
  for (let i = 0; i < 400; i++) {
    const n = days[cursor] ?? 0;
    if (n >= goal) {
      streak += 1;
      cursor = prevDateKey(cursor);
    } else if (cursor === todayKey() && n > 0 && n < goal) {
      break;
    } else if (cursor === todayKey() && n === 0) {
      cursor = prevDateKey(cursor);
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/** Record that the user opened/read a mushaf page (counts once per page per day via Set in caller optional). */
export function recordPageRead(page: number): ReadingHabitState {
  const state = readReadingHabit();
  const today = todayKey();
  const pagesKey = `${KEY}:pages:${today}`;
  let pagesToday: number[] = [];
  try {
    pagesToday = JSON.parse(localStorage.getItem(pagesKey) || "[]") as number[];
    if (!Array.isArray(pagesToday)) pagesToday = [];
  } catch {
    pagesToday = [];
  }
  if (!pagesToday.includes(page)) {
    pagesToday.push(page);
    localStorage.setItem(pagesKey, JSON.stringify(pagesToday.slice(-80)));
    state.days[today] = pagesToday.length;
    state.khatmPagesDone = Math.min(
      TOTAL_PAGES,
      Math.max(state.khatmPagesDone, page),
    );
  }
  state.lastVisitDate = today;
  state.streak = recomputeStreak(state.days, state.dailyGoalPages);
  writeReadingHabit(state);
  return state;
}

export function setDailyGoal(pages: number): ReadingHabitState {
  const state = readReadingHabit();
  state.dailyGoalPages = Math.min(30, Math.max(1, pages));
  state.streak = recomputeStreak(state.days, state.dailyGoalPages);
  writeReadingHabit(state);
  return state;
}

export function resetKhatmProgress(): ReadingHabitState {
  const state = readReadingHabit();
  state.khatmPagesDone = 0;
  writeReadingHabit(state);
  return state;
}

export function todayProgress(state: ReadingHabitState): {
  done: number;
  goal: number;
  met: boolean;
} {
  const done = state.days[todayKey()] ?? 0;
  return {
    done,
    goal: state.dailyGoalPages,
    met: done >= state.dailyGoalPages,
  };
}

export { TOTAL_PAGES as MUSHAF_TOTAL_PAGES };
