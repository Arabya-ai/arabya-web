import type { LughawiEdit, EditType } from "@/lib/lughawi/types";
import { plainRangeToPm } from "@/lib/lughawi/tiptap/plain-map";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const lughawiProofreadKey = new PluginKey<{ decorations: DecorationSet }>(
  "lughawiProofread",
);

const TYPE_CLASS: Record<EditType, string> = {
  spelling: "spelling",
  grammar: "grammar",
  morphology: "morphology",
  punctuation: "punctuation",
  style: "style",
  tashkeel: "tashkeel",
  other: "other",
};

export type ProofreadPluginMeta = {
  edits: LughawiEdit[];
  activeId: string | null;
};

function buildDecorations(
  doc: Parameters<typeof plainRangeToPm>[0],
  edits: LughawiEdit[],
  activeId: string | null,
): DecorationSet {
  const plain = doc.textBetween(0, doc.content.size, "\n", "\n");
  const widgets: Decoration[] = [];
  for (const edit of edits) {
    if (edit.end <= edit.start) continue;
    if (plain.slice(edit.start, edit.end) !== edit.original) continue;
    const { from, to } = plainRangeToPm(doc, edit.start, edit.end);
    if (to <= from) continue;
    const isActive = activeId === edit.id;
    widgets.push(
      Decoration.inline(from, to, {
        class: `lughawi-tt-mark lughawi-tt-mark--${TYPE_CLASS[edit.type]}${isActive ? " is-active" : ""}`,
        "data-lughawi-edit-id": edit.id,
      }),
    );
  }
  return DecorationSet.create(doc, widgets);
}

export type LughawiProofreadOptions = {
  onSelectEditId: (id: string | null) => void;
};

/**
 * TipTap extension: underline instant edits inside the document (Word-like).
 * Decorations are pushed from React via transaction meta.
 */
export const LughawiProofreadExtension = Extension.create<LughawiProofreadOptions>({
  name: "lughawiProofread",

  addOptions() {
    return {
      onSelectEditId: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const onSelect = this.options.onSelectEditId;
    return [
      new Plugin({
        key: lughawiProofreadKey,
        state: {
          init: (_, state) => ({
            decorations: buildDecorations(state.doc, [], null),
          }),
          apply(tr, value, _old, state) {
            const meta = tr.getMeta(lughawiProofreadKey) as
              | ProofreadPluginMeta
              | undefined;
            if (meta) {
              return {
                decorations: buildDecorations(
                  state.doc,
                  meta.edits,
                  meta.activeId,
                ),
              };
            }
            if (tr.docChanged) {
              return {
                decorations: DecorationSet.empty,
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return lughawiProofreadKey.getState(state)?.decorations;
          },
          handleClick(_view, _pos, event) {
            const el = event.target as HTMLElement | null;
            const hit = el?.closest?.("[data-lughawi-edit-id]") as HTMLElement | null;
            if (hit) {
              const id = hit.getAttribute("data-lughawi-edit-id");
              onSelect(id);
              return true;
            }
            onSelect(null);
            return false;
          },
        },
      }),
    ];
  },
});

export function dispatchProofreadDecorations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: { state: any; view: { dispatch: (tr: any) => void } } | null,
  edits: LughawiEdit[],
  activeId: string | null,
) {
  if (!editor) return;
  const tr = editor.state.tr.setMeta(lughawiProofreadKey, {
    edits,
    activeId,
  } satisfies ProofreadPluginMeta);
  editor.view.dispatch(tr);
}
