"use client";

import { LughawiSuggestionPopover } from "@/components/lughawi/LughawiSuggestionPopover";
import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import type { EditType, LughawiEdit } from "@/lib/lughawi/types";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
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
  onRejectInstant?: (edit: LughawiEdit) => void;
  onCustomInstant?: (edit: LughawiEdit, customTo: string) => void;
};

function editAtCaret(edits: LughawiEdit[], offset: number): LughawiEdit | null {
  return (
    edits.find((e) => offset >= e.start && offset <= e.end) ??
    edits.find((e) => Math.abs((e.start + e.end) / 2 - offset) <= 1) ??
    null
  );
}

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
  onRejectInstant,
  onCustomInstant,
}: Props) {
  const t = useTranslations("Lughawi");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const sortedEdits = useMemo(
    () =>
      [...instantEdits]
        .filter(
          (e) =>
            !dismissed.has(e.id) &&
            e.end > e.start &&
            text.slice(e.start, e.end) === e.original,
        )
        .sort((a, b) => a.start - b.start),
    [instantEdits, text, dismissed],
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

  const syncCaret = useCallback(
    (e: SyntheticEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      const pos = el.selectionStart ?? 0;
      const hit = editAtCaret(sortedEdits, pos);
      setActiveId(hit?.id ?? null);
    },
    [sortedEdits],
  );

  const acceptEdit = useCallback(
    (edit: LughawiEdit) => {
      const applied = applySingleEdit(text, sortedEdits, edit.id, "accepted");
      onChange(applied.text);
      onAcceptInstant?.(edit);
      setActiveId(null);
    },
    [text, sortedEdits, onChange, onAcceptInstant],
  );

  const rejectEdit = useCallback(
    (edit: LughawiEdit) => {
      setDismissed((prev) => new Set(prev).add(edit.id));
      onRejectInstant?.(edit);
      setActiveId(null);
    },
    [onRejectInstant],
  );

  const customEdit = useCallback(
    (edit: LughawiEdit, customTo: string) => {
      const applied = applySingleEdit(
        text,
        sortedEdits,
        edit.id,
        "accepted",
        customTo,
      );
      onChange(applied.text);
      onCustomInstant?.(edit, customTo);
      setActiveId(null);
    },
    [text, sortedEdits, onChange, onCustomInstant],
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
          onChange={(e) => {
            onChange(e.target.value);
            setActiveId(null);
            setDismissed(new Set());
          }}
          onKeyDown={onKeyDown}
          onClick={syncCaret}
          onKeyUp={syncCaret}
          onSelect={syncCaret}
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
        <LughawiSuggestionPopover
          edit={activeEdit}
          onAccept={acceptEdit}
          onReject={rejectEdit}
          onCustom={customEdit}
        />
      ) : null}

      {sortedEdits.length > 0 && !activeEdit ? (
        <ul className="lughawi-instant-chips" aria-label={t("instantChipsLabel")}>
          {sortedEdits.slice(0, 6).map((edit) => (
            <li key={edit.id}>
              <button
                type="button"
                className={`lughawi-instant-chip lughawi-instant-chip--${TYPE_CLASS[edit.type]}`}
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
