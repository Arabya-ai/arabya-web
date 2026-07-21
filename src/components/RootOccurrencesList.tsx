"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import type { RootOccurrence } from "@/lib/types";

const PREVIEW = 100;
const STEP = 100;

export function RootOccurrencesList({
  root,
  occurrences,
  pageOf,
}: {
  root: string;
  occurrences: RootOccurrence[];
  pageOf: Record<string, number>;
}) {
  const [visible, setVisible] = useState(
    Math.min(PREVIEW, occurrences.length),
  );

  const shown = useMemo(
    () => occurrences.slice(0, visible),
    [occurrences, visible],
  );

  const remaining = occurrences.length - visible;
  const canMore = remaining > 0;

  return (
    <div className="root-occ-block">
      <div className="root-occ-toolbar">
        <p className="root-occ-count" aria-live="polite">
          عرض {toArabicNumerals(shown.length)}
          {occurrences.length > shown.length
            ? ` من ${toArabicNumerals(occurrences.length)}`
            : null}{" "}
          موضعًا للجذر «{root}»
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
              المزيد ({toArabicNumerals(Math.min(STEP, remaining))})
            </button>
            <button
              type="button"
              className="search-show-all search-show-all--muted"
              onClick={() => setVisible(occurrences.length)}
            >
              جميع المواضع ({toArabicNumerals(occurrences.length)})
            </button>
          </div>
        ) : null}
        {visible > PREVIEW && occurrences.length > PREVIEW ? (
          <button
            type="button"
            className="search-show-all search-show-all--muted"
            onClick={() => setVisible(PREVIEW)}
          >
            عرض أول {toArabicNumerals(PREVIEW)} فقط
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
                  {getSurahUthmaniTitle(o.surahId)}{" "}
                  {toArabicNumerals(o.verse)}:{toArabicNumerals(o.position)}
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
