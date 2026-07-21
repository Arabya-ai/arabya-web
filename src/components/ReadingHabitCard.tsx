"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import {
  MUSHAF_TOTAL_PAGES,
  readReadingHabit,
  setDailyGoal,
  todayProgress,
  type ReadingHabitState,
} from "@/lib/reading-habit";

export function ReadingHabitCard() {
  const [state, setState] = useState<ReadingHabitState | null>(null);

  useEffect(() => {
    setState(readReadingHabit());
  }, []);

  if (!state) return null;

  const progress = todayProgress(state);
  const khatmPct = Math.round(
    (state.khatmPagesDone / MUSHAF_TOTAL_PAGES) * 100,
  );
  const continuePage = Math.min(
    MUSHAF_TOTAL_PAGES,
    Math.max(1, state.khatmPagesDone || 1),
  );

  return (
    <section className="habit-card" aria-labelledby="habit-h">
      <h2 id="habit-h">عادة القراءة</h2>
      <p className="habit-line">
        اليوم: {toArabicNumerals(progress.done)} /{" "}
        {toArabicNumerals(progress.goal)} صفحة
        {progress.met ? " · تم الهدف" : ""}
      </p>
      <p className="habit-line">
        السلسلة: {toArabicNumerals(state.streak)} يومًا متتالية
      </p>
      <p className="habit-line">
        تقدّم الختم (أبعد صفحة): {toArabicNumerals(state.khatmPagesDone)} /{" "}
        {toArabicNumerals(MUSHAF_TOTAL_PAGES)} ({toArabicNumerals(khatmPct)}٪)
      </p>
      <div className="habit-actions">
        <label className="habit-goal">
          الهدف اليومي
          <select
            value={state.dailyGoalPages}
            onChange={(e) => setState(setDailyGoal(Number(e.target.value)))}
            aria-label="عدد الصفحات المستهدف يوميًا"
          >
            {[1, 2, 3, 4, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {toArabicNumerals(n)}
              </option>
            ))}
          </select>
        </label>
        <Link href={getMushafPageHref(continuePage)} className="nav-pill">
          متابعة المصحف
        </Link>
        <Link href="/roots" className="nav-pill">
          فهرس الجذور
        </Link>
      </div>
    </section>
  );
}
