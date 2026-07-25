"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
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

function formatCount(value: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

export function ReadingHabitCard() {
  const t = useTranslations("Habit");
  const locale = useLocale();
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
      !window.confirm(t("resetConfirm"))
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
            <h2 id="habit-h">{t("title")}</h2>
            <button
              type="button"
              className="habit-reset-btn"
              onClick={onReset}
              title={t("resetTitle")}
              aria-label={t("resetAria")}
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
          <p className="habit-help">{t("help")}</p>
        </div>
        <label className="habit-goal">
          <span>{t("dailyGoal")}</span>
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
            aria-label={t("dailyGoalAria")}
          />
        </label>
      </header>

      <div className="habit-stats" role="group" aria-label={t("statsAria")}>
        <article className="habit-stat">
          <p className="habit-stat-label">{t("today")}</p>
          <p className="habit-stat-value">
            <strong>{formatCount(progress.done, locale)}</strong>
            <span> / {formatCount(progress.goal, locale)}</span>
          </p>
          <div
            className="habit-bar"
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemin={0}
            aria-valuemax={progress.goal}
            aria-label={t("dailyProgressAria")}
          >
            <span className="habit-bar-fill" style={{ width: `${dailyPct}%` }} />
          </div>
          <p className="habit-stat-foot">
            {progress.met
              ? t("goalMet")
              : t("remaining", {
                  count: formatCount(remaining, locale),
                })}
          </p>
        </article>

        <article className="habit-stat">
          <p className="habit-stat-label">{t("streak")}</p>
          <p className="habit-stat-value">
            <strong>{formatCount(state.streak, locale)}</strong>
            <span> {t("streakUnit")}</span>
          </p>
          <p className="habit-stat-foot">{t("streakFoot")}</p>
        </article>

        <article className="habit-stat habit-stat--wide">
          <p className="habit-stat-label">{t("khatm")}</p>
          <p className="habit-stat-value">
            <strong>{formatCount(state.khatmPagesDone, locale)}</strong>
            <span> / {formatCount(MUSHAF_TOTAL_PAGES, locale)}</span>
          </p>
          <div
            className="habit-bar habit-bar--khatm"
            role="progressbar"
            aria-valuenow={state.khatmPagesDone}
            aria-valuemin={0}
            aria-valuemax={MUSHAF_TOTAL_PAGES}
            aria-label={t("khatmProgressAria")}
          >
            <span className="habit-bar-fill" style={{ width: `${khatmPct}%` }} />
          </div>
          <p className="habit-stat-foot">
            {t("khatmFoot", {
              pct: formatCount(khatmPct, locale),
            })}
          </p>
        </article>
      </div>

      <div className="habit-actions">
        <Link href={startHref} className="habit-cta">
          {isFresh
            ? t("startFresh")
            : t("continue", {
                page: formatCount(continuePage, locale),
              })}
        </Link>
      </div>
    </section>
  );
}
