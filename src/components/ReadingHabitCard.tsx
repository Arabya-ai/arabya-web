"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import {
  MUSHAF_TOTAL_PAGES,
  getContinuePage,
  readReadingHabit,
  setDailyGoal,
  todayProgress,
  type ReadingHabitState,
} from "@/lib/reading-habit";

export function ReadingHabitCard() {
  const [state, setState] = useState<ReadingHabitState | null>(null);
  const [continuePage, setContinuePage] = useState(1);

  const refresh = useCallback(() => {
    try {
      setState(readReadingHabit());
      setContinuePage(getContinuePage());
    } catch {
      setState(readReadingHabit());
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  if (!state) return null;

  const progress = todayProgress(state);
  const khatmPct = Math.round(
    (state.khatmPagesDone / MUSHAF_TOTAL_PAGES) * 100,
  );
  const dailyPct = Math.min(
    100,
    Math.round((progress.done / progress.goal) * 100),
  );
  const remaining = Math.max(0, progress.goal - progress.done);
  const startHref = getMushafPageHref(continuePage);

  return (
    <section className="habit-card" aria-labelledby="habit-h">
      <h2 id="habit-h">عادة القراءة</h2>
      <p className="habit-help">
        اختر هدفك اليومي ثم افتح صفحات المصحف — كل صفحة جديدة تُحسب مرة واحدة
        اليوم. السلسلة تزيد عندما تُتم الهدف.
      </p>

      <div className="habit-metric">
        <div className="habit-metric-head">
          <span>
            اليوم: {toArabicNumerals(progress.done)} /{" "}
            {toArabicNumerals(progress.goal)} صفحة
          </span>
          <span className="habit-metric-status">
            {progress.met
              ? "تم الهدف ✓"
              : `يتبقى ${toArabicNumerals(remaining)}`}
          </span>
        </div>
        <div
          className="habit-bar"
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.goal}
          aria-label="تقدّم الهدف اليومي"
        >
          <span className="habit-bar-fill" style={{ width: `${dailyPct}%` }} />
        </div>
      </div>

      <p className="habit-line">
        السلسلة: {toArabicNumerals(state.streak)} يومًا متتالية أتممت فيها
        الهدف
      </p>

      <div className="habit-metric">
        <div className="habit-metric-head">
          <span>
            الختم: {toArabicNumerals(state.khatmPagesDone)} /{" "}
            {toArabicNumerals(MUSHAF_TOTAL_PAGES)} صفحة مختلفة
          </span>
          <span>{toArabicNumerals(khatmPct)}٪</span>
        </div>
        <div
          className="habit-bar habit-bar--khatm"
          role="progressbar"
          aria-valuenow={state.khatmPagesDone}
          aria-valuemin={0}
          aria-valuemax={MUSHAF_TOTAL_PAGES}
          aria-label="تقدّم الختم"
        >
          <span className="habit-bar-fill" style={{ width: `${khatmPct}%` }} />
        </div>
      </div>

      <div className="habit-actions">
        <label className="habit-goal">
          الهدف اليومي (صفحات)
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
        <Link href={startHref} className="nav-pill habit-cta">
          {progress.done === 0 && state.khatmPagesDone === 0
            ? "ابدأ القراءة"
            : `متابعة من الصفحة ${toArabicNumerals(continuePage)}`}
        </Link>
      </div>
    </section>
  );
}
