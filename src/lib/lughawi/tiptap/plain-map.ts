import type { Node as PmNode } from "@tiptap/pm/model";

/** Plain text from a single-paragraph (+ hardBreak) TipTap doc. */
export function docToPlainText(doc: PmNode): string {
  return doc.textBetween(0, doc.content.size, "\n", "\n");
}

/**
 * Map a plain-text UTF-16 offset to a ProseMirror position
 * for docs that only use paragraph + text + hardBreak.
 */
export function plainOffsetToPmPos(doc: PmNode, plainOffset: number): number {
  const clamped = Math.max(0, Math.min(plainOffset, docToPlainText(doc).length));
  let seen = 0;
  let found: number | null = null;

  doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.isText && node.text) {
      const len = node.text.length;
      if (clamped <= seen + len) {
        found = pos + (clamped - seen);
        return false;
      }
      seen += len;
      return true;
    }
    if (node.type.name === "hardBreak") {
      if (clamped === seen) {
        found = pos;
        return false;
      }
      seen += 1;
      if (clamped === seen) {
        found = pos + 1;
        return false;
      }
    }
    return true;
  });

  if (found !== null) return found;
  return doc.content.size;
}

export function plainRangeToPm(
  doc: PmNode,
  start: number,
  end: number,
): { from: number; to: number } {
  return {
    from: plainOffsetToPmPos(doc, start),
    to: plainOffsetToPmPos(doc, end),
  };
}

/** Build TipTap/ProseMirror JSON from plain text (newlines → hardBreak). */
export function plainTextToDocJson(text: string): {
  type: "doc";
  content: Array<{
    type: "paragraph";
    content?: Array<
      | { type: "text"; text: string }
      | { type: "hardBreak" }
    >;
  }>;
} {
  if (!text) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  const lines = text.split("\n");
  const content: Array<
    { type: "text"; text: string } | { type: "hardBreak" }
  > = [];
  lines.forEach((line, i) => {
    if (line.length > 0) content.push({ type: "text", text: line });
    if (i < lines.length - 1) content.push({ type: "hardBreak" });
  });
  return {
    type: "doc",
    content: [{ type: "paragraph", content: content.length ? content : undefined }],
  };
}
