"use client";

import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import type { EditType, LughawiEdit } from "@/lib/lughawi/types";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

const TYPE_CLASS: Record<EditType, string> = {
  spelling: "spelling",
  grammar: "grammar",
  morphology: "morphology",
  punctuation: "punctuation",
  style: "style",
  tashkeel: "tashkeel",
  other: "other",
};

type Props = {
  text: string;
  onChange: (next: string) => void;
  instantEdits: LughawiEdit[];
  disabled?: boolean;
  pending?: boolean;
  placeholder: string;
  hintId: string;
  hintText: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAcceptInstant?: (edit: LughawiEdit) => void;
};

export function LughawiEditorWithHints({
  text,
  onChange,
  instantEdits,
  disabled,
  pending,
  placeholder,
  hintId,
  hintText,
  onKeyDown,
  onAcceptInstant,
}: Props) {
  const t = useTranslations("Lughawi");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedEdits = useMemo(
    () =>
      [...instantEdits]
        .filter((e) => e.end > e.start && text.slice(e.start, e.end) === e.original)
        .sort((a, b) => a.start - b.start),
    [instantEdits, text],
  );

  const backdrop = useMemo(() => {
    if (!text) return null;
    const nodes: ReactNode[] = [];
    let cursor = 0;
    sortedEdits.forEach((edit, i) => {
      if (edit.start < cursor) return;
      if (edit.start > cursor) {
        nodes.push(
          <span key={`plain-${i}`}>{text.slice(cursor, edit.start)}</span>,
        );
      }
      const isActive = activeId === edit.id;
      nodes.push(
        <mark
          key={edit.id}
          className={`lughawi-instant-mark lughawi-instant-mark--${TYPE_CLASS[edit.type]}${isActive ? " is-active" : ""}`}
          onMouseEnter={() => setActiveId(edit.id)}
          onMouseLeave={() => setActiveId((id) => (id === edit.id ? null : id))}
        >
          {text.slice(edit.start, edit.end)}
        </mark>,
      );
      cursor = edit.end;
    });
    if (cursor < text.length) {
      nodes.push(<span key="tail">{text.slice(cursor)}</span>);
    }
    return nodes;
  }, [text, sortedEdits, activeId]);

  const activeEdit = sortedEdits.find((e) => e.id === activeId) ?? null;

  const acceptEdit = useCallback(
    (edit: LughawiEdit) => {
      const applied = applySingleEdit(text, sortedEdits, edit.id, "accepted");
      onChange(applied.text);
      onAcceptInstant?.(edit);
      setActiveId(null);
    },
    [text, sortedEdits, onChange, onAcceptInstant],
  );

  return (
    <div className="lughawi-editor-stack">
      <div
        className={`lughawi-editor-wrap${pending ? " is-busy" : ""}${disabled ? " is-disabled" : ""}`}
      >
        <div className="lughawi-editor-backdrop" dir="rtl" aria-hidden>
          {text ? backdrop : <span className="lughawi-editor-placeholder">{placeholder}</span>}
        </div>
        <textarea
          className="lughawi-editor-input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || pending}
          placeholder=""
          dir="rtl"
          spellCheck={false}
          aria-describedby={hintId}
          aria-busy={pending || undefined}
        />
        {pending ? (
          <div className="lughawi-editor-busy" aria-hidden>
            <span className="lughawi-editor-busy-bar" />
          </div>
        ) : null}
      </div>

      {activeEdit ? (
        <div
          className="lughawi-instant-popover"
          role="dialog"
          aria-label={t("instantSuggestionTitle")}
        >
          <p className="lughawi-instant-popover-rule">{activeEdit.explanation}</p>
          <p className="lughawi-instant-popover-diff">
            <span>{activeEdit.original}</span>
            <span aria-hidden>→</span>
            <strong>{activeEdit.suggestion}</strong>
          </p>
          <div className="lughawi-instant-popover-actions">
            <button type="button" className="lughawi-primary" onClick={() => acceptEdit(activeEdit)}>
              <Check className="lughawi-ico" aria-hidden />
              {t("accept")}
            </button>
            <button type="button" onClick={() => setActiveId(null)}>
              <X className="lughawi-ico" aria-hidden />
              {t("reject")}
            </button>
          </div>
        </div>
      ) : null}

      {sortedEdits.length > 0 && !activeEdit ? (
        <ul className="lughawi-instant-chips" aria-label={t("instantChipsLabel")}>
          {sortedEdits.slice(0, 6).map((edit) => (
            <li key={edit.id}>
              <button
                type="button"
                className={`lughawi-instant-chip lughawi-instant-chip--${TYPE_CLASS[edit.type]}`}
                onMouseEnter={() => setActiveId(edit.id)}
                onFocus={() => setActiveId(edit.id)}
                onClick={() => setActiveId(edit.id)}
              >
                {edit.original} → {edit.suggestion}
              </button>
            </li>
          ))}
          {sortedEdits.length > 6 ? (
            <li className="lughawi-instant-chip-more">
              {t("instantMore", { count: sortedEdits.length - 6 })}
            </li>
          ) : null}
        </ul>
      ) : null}

      <span id={hintId} className="lughawi-hint">
        {hintText}
      </span>
    </div>
  );
}
