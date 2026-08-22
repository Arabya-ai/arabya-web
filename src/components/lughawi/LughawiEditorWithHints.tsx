"use client";

import { LughawiSuggestionPopover } from "@/components/lughawi/LughawiSuggestionPopover";
import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import {
  dispatchProofreadDecorations,
  LughawiProofreadExtension,
} from "@/lib/lughawi/tiptap/proofread-extension";
import {
  docToPlainText,
  plainTextToDocJson,
} from "@/lib/lughawi/tiptap/plain-map";
import type { EditType, LughawiEdit } from "@/lib/lughawi/types";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

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
  onKeyDown?: (e: ReactKeyboardEvent) => void;
  onAcceptInstant?: (edit: LughawiEdit) => void;
  onRejectInstant?: (edit: LughawiEdit) => void;
  onCustomInstant?: (edit: LughawiEdit, customTo: string) => void;
};

type PopCoords = { top: number; left: number };

/**
 * L1 Word-like editor: TipTap document with inline underlines on the words
 * themselves and a floating accept / reject / custom suggestion panel.
 */
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
  const [popCoords, setPopCoords] = useState<PopCoords | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextEmit = useRef(false);
  const onKeyDownRef = useRef(onKeyDown);
  onKeyDownRef.current = onKeyDown;

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

  const activeEdit = sortedEdits.find((e) => e.id === activeId) ?? null;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !(disabled || pending),
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      LughawiProofreadExtension.configure({
        onSelectEditId: (id) => {
          setActiveId(id);
        },
      }),
    ],
    content: plainTextToDocJson(text),
    editorProps: {
      attributes: {
        class: "lughawi-tt-content",
        dir: "rtl",
        spellcheck: "false",
        "aria-describedby": hintId,
        "aria-busy": pending ? "true" : "false",
      },
      handleDOMEvents: {
        keydown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            onKeyDownRef.current?.(
              event as unknown as ReactKeyboardEvent,
            );
            return true;
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (skipNextEmit.current) {
        skipNextEmit.current = false;
        return;
      }
      const next = docToPlainText(ed.state.doc);
      setActiveId(null);
      setDismissed(new Set());
      setPopCoords(null);
      onChange(next);
    },
  });

  // Sync external text (sample chips, accept, clear) into the editor.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = docToPlainText(editor.state.doc);
    if (current === text) return;
    skipNextEmit.current = true;
    editor.commands.setContent(plainTextToDocJson(text), false);
  }, [text, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!(disabled || pending));
  }, [editor, disabled, pending]);

  // Push underline decorations whenever edits / active change.
  useEffect(() => {
    dispatchProofreadDecorations(editor, sortedEdits, activeId);
  }, [editor, sortedEdits, activeId]);

  // Position floating popover from the marked word's DOM box (RTL-safe).
  useEffect(() => {
    if (!editor || !activeEdit || editor.isDestroyed) {
      setPopCoords(null);
      return;
    }
    const place = () => {
      const mark = editor.view.dom.querySelector(
        `[data-lughawi-edit-id="${CSS.escape(activeEdit.id)}"]`,
      ) as HTMLElement | null;
      if (!mark) {
        setPopCoords(null);
        return;
      }
      const rect = mark.getBoundingClientRect();
      const width = 320;
      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, window.innerWidth - width - 12),
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < 240
          ? Math.max(12, rect.top - 8 - 200)
          : rect.bottom + 10;
      setPopCoords({ top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [editor, activeEdit]);

  const acceptEdit = useCallback(
    (edit: LughawiEdit) => {
      const applied = applySingleEdit(text, sortedEdits, edit.id, "accepted");
      onChange(applied.text);
      onAcceptInstant?.(edit);
      setActiveId(null);
      setPopCoords(null);
    },
    [text, sortedEdits, onChange, onAcceptInstant],
  );

  const rejectEdit = useCallback(
    (edit: LughawiEdit) => {
      setDismissed((prev) => new Set(prev).add(edit.id));
      onRejectInstant?.(edit);
      setActiveId(null);
      setPopCoords(null);
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
      setPopCoords(null);
    },
    [text, sortedEdits, onChange, onCustomInstant],
  );

  return (
    <div className="lughawi-editor-stack">
      <div
        ref={wrapRef}
        className={`lughawi-editor-wrap lughawi-tt-wrap${pending ? " is-busy" : ""}${disabled ? " is-disabled" : ""}`}
      >
        <EditorContent editor={editor} />
        {pending ? (
          <div className="lughawi-editor-busy" aria-hidden>
            <span className="lughawi-editor-busy-bar" />
          </div>
        ) : null}
      </div>

      {activeEdit && popCoords && typeof document !== "undefined"
        ? createPortal(
            <div
              className="lughawi-tt-float"
              style={{ top: popCoords.top, left: popCoords.left }}
            >
              <LughawiSuggestionPopover
                edit={activeEdit}
                onAccept={acceptEdit}
                onReject={rejectEdit}
                onCustom={customEdit}
              />
            </div>,
            document.body,
          )
        : null}

      {activeEdit && !popCoords ? (
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
