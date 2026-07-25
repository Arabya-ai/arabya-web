"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { getSurahDisplayTitle } from "@/lib/surah-names";
import type { RootOccurrence } from "@/lib/types";

const PREVIEW = 100;
const STEP = 100;

function formatCount(value: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

export function RootOccurrencesList({
  root,
  occurrences,
  pageOf,
}: {
  root: string;
  occurrences: RootOccurrence[];
  pageOf: Record<string, number>;
}) {
  const t = useTranslations("Roots");
  const locale = useLocale();
  const [visible, setVisible] = useState(
    Math.min(PREVIEW, occurrences.length),
  );

  const shown = useMemo(
    () => occurrences.slice(0, visible),
    [occurrences, visible],
  );

  const remaining = occurrences.length - visible;
  const canMore = remaining > 0;
  const totalPart =
    occurrences.length > shown.length
      ? t("occTotalPart", { total: formatCount(occurrences.length, locale) })
      : "";

  return (
    <div className="root-occ-block">
      <div className="root-occ-toolbar">
        <p className="root-occ-count" aria-live="polite">
          {t("occShowing", {
            shown: formatCount(shown.length, locale),
            totalPart,
            root,
          })}
        </p>
        {canMore ? (
          <div className="root-occ-actions">
            <button
              type="button"
              className="search-show-all"
              onClick={() =>
                setVisible((n) => Math.min(n + STEP, occurrences.length))
              }
            >
              {t("occMore", {
                count: formatCount(Math.min(STEP, remaining), locale),
              })}
            </button>
            <button
              type="button"
              className="search-show-all search-show-all--muted"
              onClick={() => setVisible(occurrences.length)}
            >
              {t("occShowAll", {
                count: formatCount(occurrences.length, locale),
              })}
            </button>
          </div>
        ) : null}
        {visible > PREVIEW && occurrences.length > PREVIEW ? (
          <button
            type="button"
            className="search-show-all search-show-all--muted"
            onClick={() => setVisible(PREVIEW)}
          >
            {t("occShowFirst", { count: formatCount(PREVIEW, locale) })}
          </button>
        ) : null}
      </div>

      <ul className="root-list">
        {shown.map((o) => {
          const page = pageOf[`${o.surahId}:${o.verse}`] ?? 1;
          return (
            <li key={o.wordId}>
              <Link
                href={`${getMushafPageHref(page)}#s${o.surahId}-v-${o.verse}`}
              >
                <span className="root-surface">{o.surface}</span>
                <span className="root-ref">
                  {getSurahDisplayTitle(o.surahId, locale)}{" "}
                  {formatCount(o.verse, locale)}:
                  {formatCount(o.position, locale)}
                  {o.lemma ? ` · ${o.lemma}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
