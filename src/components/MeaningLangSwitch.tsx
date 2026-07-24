"use client";

import type { MeaningLang } from "@/hooks/mushaf-utils";

const MEANING_LABELS: { id: MeaningLang; label: string }[] = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "English" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "ur", label: "اردو" },
];

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
  return (
    <div className="meaning-lang-block">
      <div
        className="lang-switch"
        role="group"
        aria-label="لغة ترجمة الكلمة"
        id={`${idPrefix}-group`}
      >
        {MEANING_LABELS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`lang-chip ${value === l.id ? "is-active" : ""}`}
            onClick={() => onChange(l.id)}
            aria-pressed={value === l.id}
          >
            {l.label}
          </button>
        ))}
      </div>
      {note ? <p className="meaning-lang-note">{note}</p> : null}
    </div>
  );
}
