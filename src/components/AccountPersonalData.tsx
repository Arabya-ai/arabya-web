"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getContinuePage,
  readReadingHabit,
  todayProgress,
} from "@/lib/reading-habit";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { FavoritesLibrary } from "@/components/FavoritesLibrary";

export function AccountPersonalData() {
  const [page, setPage] = useState(1);
  const [habitLine, setHabitLine] = useState("…");

  useEffect(() => {
    const continuePage = getContinuePage();
    setPage(continuePage);
    const habit = readReadingHabit();
    const today = todayProgress(habit);
    setHabitLine(
      `اليوم ${toArabicNumerals(today.done)}/${toArabicNumerals(today.goal)} صفحة · السلسلة ${toArabicNumerals(habit.streak)} · الختم ${toArabicNumerals(habit.khatmPagesDone)}/٦٠٤`,
    );
  }, []);

  return (
    <>
      <article className="account-panel">
        <h2>متابعة القراءة</h2>
        <p>آخر صفحة على هذا الجهاز (وتُزامن مع حسابك).</p>
        <Link href={getMushafPageHref(page)} className="account-panel-link">
          متابعة من صفحة {toArabicNumerals(page)}
        </Link>
      </article>

      <article className="account-panel">
        <h2>عادة القراءة</h2>
        <p>{habitLine}</p>
        <Link href={getMushafPageHref(page)} className="account-panel-link">
          فتح المصحف
        </Link>
      </article>

      <div className="account-library-wrap">
        <div className="library-block-head" style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem" }}>المفضّلات والملاحظات</h2>
          <Link href="/favorites" className="account-panel-link">
            الصفحة الكاملة
          </Link>
        </div>
        <FavoritesLibrary mode="preview" />
      </div>
    </>
  );
}
