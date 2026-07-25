"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  getContinuePage,
  readReadingHabit,
  todayProgress,
} from "@/lib/reading-habit";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { FavoritesLibrary } from "@/components/FavoritesLibrary";

function formatNum(value: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

export function AccountPersonalData() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [habitLine, setHabitLine] = useState("…");

  useEffect(() => {
    const continuePage = getContinuePage();
    setPage(continuePage);
    const habit = readReadingHabit();
    const today = todayProgress(habit);
    setHabitLine(
      t("habitLine", {
        done: formatNum(today.done, locale),
        goal: formatNum(today.goal, locale),
        streak: formatNum(habit.streak, locale),
        khatmDone: formatNum(habit.khatmPagesDone, locale),
      }),
    );
  }, [locale, t]);

  return (
    <>
      <article className="account-panel">
        <h2>{t("continueReading")}</h2>
        <p>{t("continueReadingLead")}</p>
        <Link href={getMushafPageHref(page)} className="account-panel-link">
          {t("continueFromPage", { page: formatNum(page, locale) })}
        </Link>
      </article>

      <article className="account-panel">
        <h2>{t("readingHabitTitle")}</h2>
        <p>{habitLine}</p>
        <Link href={getMushafPageHref(page)} className="account-panel-link">
          {t("openMushaf")}
        </Link>
      </article>

      <div className="account-library-wrap">
        <div className="library-block-head" style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{t("favoritesNotesTitle")}</h2>
          <Link href="/favorites" className="account-panel-link">
            {t("fullPage")}
          </Link>
        </div>
        <FavoritesLibrary mode="preview" />
      </div>
    </>
  );
}
