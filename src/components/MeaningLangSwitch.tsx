"use client";

import { useTranslations } from "next-intl";

import type { MeaningLang } from "@/hooks/mushaf-utils";

const MEANING_LANGS: MeaningLang[] = ["ar", "en", "id", "ur"];

export function MeaningLangSwitch({
  value,
  onChange,
  idPrefix = "meaning-lang",
  note,
}: {
  value: MeaningLang;
  onChange: (lang: MeaningLang) => void;
  idPrefix?: string;
  note?: string;
}) {
  const t = useTranslations("MeaningLang");

  return (
    <div className="meaning-lang-block">
      <div
        className="lang-switch"
        role="group"
        aria-label={t("ariaLabel")}
        id={`${idPrefix}-group`}
      >
        {MEANING_LANGS.map((id) => (
          <button
            key={id}
            type="button"
            className={`lang-chip ${value === id ? "is-active" : ""}`}
            onClick={() => onChange(id)}
            aria-pressed={value === id}
          >
            {t(id)}
          </button>
        ))}
      </div>
      {note ? <p className="meaning-lang-note">{note}</p> : null}
    </div>
  );
}
