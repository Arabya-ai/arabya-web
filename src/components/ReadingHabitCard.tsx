"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import {
  MUSHAF_TOTAL_PAGES,
  getContinuePage,
  readReadingHabit,
  resetReadingHabit,
  setDailyGoal,
  todayProgress,
  type ReadingHabitState,
} from "@/lib/reading-habit";

export function ReadingHabitCard() {
  const [state, setState] = useState<ReadingHabitState | null>(null);
  const [continuePage, setContinuePage] = useState(1);
  const [goalDraft, setGoalDraft] = useState("2");

  const refresh = useCallback(() => {
    try {
      const next = readReadingHabit();
      setState(next);
      setGoalDraft(String(next.dailyGoalPages));
      setContinuePage(getContinuePage());
    } catch {
      const next = readReadingHabit();
      setState(next);
      setGoalDraft(String(next.dailyGoalPages));
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

  const commitGoal = () => {
    const n = Number.parseInt(goalDraft.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n)) {
      setGoalDraft(String(state?.dailyGoalPages ?? 2));
      return;
    }
    const next = setDailyGoal(n);
    setState(next);
    setGoalDraft(String(next.dailyGoalPages));
  };

  const onReset = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("هل تريد مسح عادة القراءة والبدء من جديد؟")
    ) {
      return;
    }
    const next = resetReadingHabit();
    setState(next);
    setGoalDraft(String(next.dailyGoalPages));
    setContinuePage(1);
  };

  if (!state) return null;

  const progress = todayProgress(state);
  const khatmPct = Math.min(
    100,
    Math.round((state.khatmPagesDone / MUSHAF_TOTAL_PAGES) * 100),
  );
  const dailyPct = Math.min(
    100,
    Math.round((progress.done / Math.max(1, progress.goal)) * 100),
  );
  const remaining = Math.max(0, progress.goal - progress.done);
  const startHref = getMushafPageHref(continuePage);
  const isFresh = progress.done === 0 && state.khatmPagesDone === 0;

  return (
    <section className="habit-panel" aria-labelledby="habit-h">
      <header className="habit-panel-head">
        <div className="habit-panel-titles">
          <div className="habit-title-row">
            <h2 id="habit-h">عادة القراءة</h2>
            <button
              type="button"
              className="habit-reset-btn"
              onClick={onReset}
              title="مسح التسجيل والعودة للافتراضي"
              aria-label="مسح تسجيل عادة القراءة والعودة للافتراضي"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 4v6h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 20v-6h-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 10a8 8 0 0 1 14-2M19 14a8 8 0 0 1-14 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="habit-help">
            كل صفحة مصحف جديدة تُحسب مرة واحدة فقط في اليوم — لا يتكرر عدّ نفس
            الصفحة.
          </p>
        </div>
        <label className="habit-goal">
          <span>الهدف اليومي (صفحات)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            step={1}
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            onBlur={commitGoal}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="أدخل عدد الصفحات المستهدف يوميًا"
          />
        </label>
      </header>

      <div className="habit-stats" role="group" aria-label="مؤشرات القراءة">
        <article className="habit-stat">
          <p className="habit-stat-label">اليوم</p>
          <p className="habit-stat-value">
            <strong>{toArabicNumerals(progress.done)}</strong>
            <span> / {toArabicNumerals(progress.goal)}</span>
          </p>
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
          <p className="habit-stat-foot">
            {progress.met
              ? "أتممت هدف اليوم"
              : `يتبقى ${toArabicNumerals(remaining)}`}
          </p>
        </article>

        <article className="habit-stat">
          <p className="habit-stat-label">السلسلة</p>
          <p className="habit-stat-value">
            <strong>{toArabicNumerals(state.streak)}</strong>
            <span> يومًا</span>
          </p>
          <p className="habit-stat-foot">أيام متتالية بأهداف مكتملة</p>
        </article>

        <article className="habit-stat habit-stat--wide">
          <p className="habit-stat-label">الختم</p>
          <p className="habit-stat-value">
            <strong>{toArabicNumerals(state.khatmPagesDone)}</strong>
            <span> / {toArabicNumerals(MUSHAF_TOTAL_PAGES)}</span>
          </p>
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
          <p className="habit-stat-foot">
            {toArabicNumerals(khatmPct)}٪ صفحات مختلفة فُتحت
          </p>
        </article>
      </div>

      <div className="habit-actions">
        <Link href={startHref} className="habit-cta">
          {isFresh
            ? "ابدأ القراءة من المصحف"
            : `متابعة من الصفحة ${toArabicNumerals(continuePage)}`}
        </Link>
      </div>
    </section>
  );
}
