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

/** In-memory guard against Strict Mode double-invoke races in the same tick. */
const sessionCounted = new Set<string>();

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

function normalizePage(page: number): number | null {
  const n = Math.trunc(Number(page));
  if (!Number.isFinite(n) || n < 1 || n > TOTAL_PAGES) return null;
  return n;
}

function uniquePages(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const item of raw) {
    const n = normalizePage(Number(item));
    if (n == null || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function pagesTodayKey(day = todayKey()): string {
  return `${KEY}:pages:${day}`;
}

function readPagesToday(day = todayKey()): number[] {
  try {
    return uniquePages(JSON.parse(localStorage.getItem(pagesTodayKey(day)) || "[]"));
  } catch {
    return [];
  }
}

function writePagesToday(pages: number[], day = todayKey()): void {
  localStorage.setItem(
    pagesTodayKey(day),
    JSON.stringify(uniquePages(pages).slice(-120)),
  );
}

function readKhatmPages(): number[] {
  try {
    return uniquePages(JSON.parse(localStorage.getItem(KHATM_PAGES_KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeKhatmPages(pages: number[]): void {
  localStorage.setItem(
    KHATM_PAGES_KEY,
    JSON.stringify(uniquePages(pages).slice(0, TOTAL_PAGES)),
  );
}

export function readReadingHabit(): ReadingHabitState {
  try {
    const raw = localStorage.getItem(KEY);
    const today = todayKey();
    const pagesToday = readPagesToday(today);
    const khatmCount = readKhatmPages().length;
    if (!raw) {
      return {
        ...emptyState(),
        days: pagesToday.length ? { [today]: pagesToday.length } : {},
        khatmPagesDone: khatmCount,
      };
    }
    const parsed = JSON.parse(raw) as Partial<ReadingHabitState>;
    const days =
      parsed.days && typeof parsed.days === "object" ? { ...parsed.days } : {};
    // Source of truth for today = unique page list, not a stale counter.
    days[today] = pagesToday.length;
    return {
      ...emptyState(),
      ...parsed,
      days,
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
  const p = normalizePage(page);
  if (p == null) return readReadingHabit();

  const today = todayKey();
  const sessionKey = `${today}:${p}`;
  const pagesToday = readPagesToday(today);

  if (!pagesToday.includes(p) && !sessionCounted.has(sessionKey)) {
    pagesToday.push(p);
    writePagesToday(pagesToday, today);
  }
  sessionCounted.add(sessionKey);

  const khatm = readKhatmPages();
  if (!khatm.includes(p)) {
    khatm.push(p);
    writeKhatmPages(khatm);
  }

  const state = readReadingHabit();
  state.days[today] = readPagesToday(today).length;
  state.khatmPagesDone = readKhatmPages().length;
  state.lastVisitDate = today;
  state.streak = recomputeStreak(state.days, state.dailyGoalPages);
  writeReadingHabit(state);
  return state;
}

export function setDailyGoal(pages: number): ReadingHabitState {
  const state = readReadingHabit();
  const n = Math.trunc(Number(pages));
  state.dailyGoalPages = Math.min(30, Math.max(1, Number.isFinite(n) ? n : 2));
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

/** Wipe habit progress and restore defaults (goal=2, empty streak/khatm/today). */
export function resetReadingHabit(): ReadingHabitState {
  const prefix = `${KEY}:pages:`;
  const remove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k === KEY || k === KHATM_PAGES_KEY || k.startsWith(prefix))
      ) {
        remove.push(k);
      }
    }
  } catch {
    remove.push(KEY, KHATM_PAGES_KEY, pagesTodayKey());
  }
  for (const k of remove) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(LAST_MUSHAF_PAGE_KEY);
  } catch {
    /* ignore */
  }
  sessionCounted.clear();
  const state = emptyState();
  writeReadingHabit(state);
  return state;
}

export function todayProgress(state: ReadingHabitState): {
  done: number;
  goal: number;
  met: boolean;
} {
  let done = 0;
  try {
    done = readPagesToday().length;
  } catch {
    done = state.days[todayKey()] ?? 0;
  }
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
