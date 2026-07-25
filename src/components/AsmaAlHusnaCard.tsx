"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toArabicNumerals } from "@/lib/format";

type AsmaName = {
  number: number;
  nameAr: string;
  transliteration: string;
  meaningAr: string;
  meaningEn: string;
};

export function AsmaAlHusnaCard() {
  const t = useTranslations("Asma");
  const locale = useLocale();
  const [today, setToday] = useState<AsmaName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/asma-al-husna");
        const data = (await res.json()) as {
          today?: AsmaName;
          error?: string;
        };
        if (!res.ok || !data.today) {
          if (!cancelled) setError(t("errorFetch"));
          return;
        }
        if (!cancelled) setToday(data.today);
      } catch {
        if (!cancelled) setError(t("errorConnection"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const numberLabel =
    today && locale === "ar"
      ? toArabicNumerals(today.number)
      : today
        ? String(today.number)
        : null;

  return (
    <section className="asma-panel" aria-labelledby="asma-h">
      <header className="asma-panel-head">
        <div>
          <h2 id="asma-h">{t("title")}</h2>
        </div>
        <Link href="/asma" className="nav-pill">
          {t("viewAll")}
        </Link>
      </header>

      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {today ? (
        <Link href={`/asma/${today.number}`} className="asma-today asma-today-link">
          <p className="asma-number">{numberLabel}</p>
          <p className="asma-name">{today.nameAr}</p>
          <p className="asma-trans">{today.transliteration}</p>
          {today.meaningEn && locale === "en" ? (
            <p className="asma-meaning">{today.meaningEn}</p>
          ) : today.meaningAr ? (
            <p className="asma-meaning">{today.meaningAr}</p>
          ) : today.meaningEn ? (
            <p className="asma-meaning">{today.meaningEn}</p>
          ) : null}
        </Link>
      ) : !error ? (
        <p className="prayer-status">{t("loading")}</p>
      ) : null}
    </section>
  );
}
