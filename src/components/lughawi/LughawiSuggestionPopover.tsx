"use client";

import type { LughawiEdit } from "@/lib/lughawi/types";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

type Props = {
  edit: LughawiEdit;
  onAccept: (edit: LughawiEdit) => void;
  onReject: (edit: LughawiEdit) => void;
  onCustom: (edit: LughawiEdit, customTo: string) => void;
  compact?: boolean;
};

/** Accept / reject / type-your-own correction for Word-like inline learning. */
export function LughawiSuggestionPopover({
  edit,
  onAccept,
  onReject,
  onCustom,
  compact,
}: Props) {
  const t = useTranslations("Lughawi");
  const [customTo, setCustomTo] = useState(edit.suggestion);
  const [showCustom, setShowCustom] = useState(false);

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    const next = customTo.trim();
    if (!next || next === edit.original) return;
    onCustom(edit, next);
  }

  return (
    <div
      className={`lughawi-suggestion-pop${compact ? " is-compact" : ""}`}
      role="dialog"
      aria-label={t("instantSuggestionTitle")}
    >
      <p className="lughawi-suggestion-pop-rule">{edit.explanation}</p>
      <p className="lughawi-suggestion-pop-diff">
        <span>{edit.original}</span>
        <span aria-hidden>→</span>
        <strong>{edit.suggestion}</strong>
      </p>
      <div className="lughawi-suggestion-pop-actions">
        <button type="button" className="lughawi-primary" onClick={() => onAccept(edit)}>
          <Check className="lughawi-ico" aria-hidden />
          {t("accept")}
        </button>
        <button type="button" className="lughawi-reject" onClick={() => onReject(edit)}>
          <X className="lughawi-ico" aria-hidden />
          {t("reject")}
        </button>
        <button type="button" onClick={() => setShowCustom((v) => !v)}>
          {t("customFix")}
        </button>
      </div>
      {showCustom ? (
        <form className="lughawi-suggestion-pop-custom" onSubmit={submitCustom}>
          <label htmlFor={`lughawi-custom-${edit.id}`}>{t("customFixLabel")}</label>
          <input
            id={`lughawi-custom-${edit.id}`}
            type="text"
            dir="rtl"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            placeholder={t("customFixPlaceholder")}
            autoFocus
          />
          <button type="submit" className="lughawi-primary" disabled={!customTo.trim()}>
            {t("applyCustomFix")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
