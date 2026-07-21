/** Local reading habit: daily goal, streak, khatm by unique pages (localStorage). */

export type ReadingHabitState = {
  /** Target mushaf pages per calendar day */
  dailyGoalPages: number;
  /** YYYY-MM-DD → unique pages opened that day */
  days: Record<string, number>;
  streak: number;
  /** Unique mushaf pages ever opened (khatm progress) */
  khatmPagesDone: number;
  lastVisitDate: string | null;
};

const KEY = "arabya-reading-habit";
const KHATM_PAGES_KEY = "arabya-reading-habit:khatm-pages";
const TOTAL_PAGES = 604;
export const LAST_MUSHAF_PAGE_KEY = "arabya-last-mushaf-page";

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

function readKhatmPages(): number[] {
  try {
    const raw = localStorage.getItem(KHATM_PAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) => Number.isInteger(p) && p >= 1 && p <= TOTAL_PAGES,
    );
  } catch {
    return [];
  }
}

function writeKhatmPages(pages: number[]): void {
  localStorage.setItem(KHATM_PAGES_KEY, JSON.stringify(pages.slice(0, TOTAL_PAGES)));
}

export function readReadingHabit(): ReadingHabitState {
  try {
    const raw = localStorage.getItem(KEY);
    const khatmCount = readKhatmPages().length;
    if (!raw) {
      return { ...emptyState(), khatmPagesDone: khatmCount };
    }
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
      khatmPagesDone: khatmCount,
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

/** Record that the user opened a mushaf page (once per page per day; once forever for khatm). */
export function recordPageRead(page: number): ReadingHabitState {
  if (!Number.isInteger(page) || page < 1 || page > TOTAL_PAGES) {
    return readReadingHabit();
  }

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
  }

  const khatm = readKhatmPages();
  if (!khatm.includes(page)) {
    khatm.push(page);
    writeKhatmPages(khatm);
  }
  state.khatmPagesDone = khatm.length;

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
  writeKhatmPages([]);
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

/** Last opened mushaf page, or 1 if none. */
export function getContinuePage(): number {
  try {
    const raw = Number(localStorage.getItem(LAST_MUSHAF_PAGE_KEY));
    if (Number.isInteger(raw) && raw >= 1 && raw <= TOTAL_PAGES) return raw;
  } catch {
    /* ignore */
  }
  return 1;
}

export { TOTAL_PAGES as MUSHAF_TOTAL_PAGES };
