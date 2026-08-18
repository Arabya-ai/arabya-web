"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { TasbeehPhrase } from "@/lib/adhkar";
import {
  getTasbeehState,
  incrementTasbeeh,
  resetTasbeeh,
  setTasbeehPhrase,
} from "@/lib/adhkar-progress";
import { formatCount } from "@/lib/format";

export function TasbeehCounter({ phrases }: { phrases: TasbeehPhrase[] }) {
  const t = useTranslations("Adhkar");
  const locale = useLocale();
  const fallbackId = phrases[0]?.id ?? "subhanallah";
  const [phraseId, setPhraseId] = useState(fallbackId);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const saved = getTasbeehState();
    const known = phrases.some((p) => p.id === saved.phraseId)
      ? saved.phraseId
      : fallbackId;
    setPhraseId(known);
    setCount(saved.count);
    if (known !== saved.phraseId) {
      setTasbeehPhrase(known);
    }
  }, [fallbackId, phrases]);

  const phrase = useMemo(
    () => phrases.find((p) => p.id === phraseId) ?? phrases[0],
    [phraseId, phrases],
  );

  if (!phrase) {
    return <p className="empty-state">{t("tasbeehEmpty")}</p>;
  }

  return (
    <section className="tasbeeh-panel" aria-labelledby="tasbeeh-heading">
      <h2 id="tasbeeh-heading" className="sr-only">
        {t("tools.tasbeeh")}
      </h2>
      <label className="tasbeeh-select">
        <span>{t("tasbeehPhrase")}</span>
        <select
          value={phraseId}
          onChange={(e) => {
            const next = setTasbeehPhrase(e.target.value);
            setPhraseId(next.phraseId);
          }}
        >
          {phrases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.textAr}
            </option>
          ))}
        </select>
      </label>

      <p className="tasbeeh-phrase" lang="ar" dir="rtl">
        {phrase.textAr}
      </p>
      <p className="tasbeeh-count" aria-live="polite" aria-atomic="true">
        {formatCount(count, locale)}
      </p>

      <button
        type="button"
        className="tasbeeh-tap"
        onClick={() => setCount(incrementTasbeeh().count)}
      >
        {t("tasbeehTap")}
      </button>
      <button
        type="button"
        className="nav-pill"
        onClick={() => setCount(resetTasbeeh().count)}
      >
        {t("reset")}
      </button>
    </section>
  );
}
