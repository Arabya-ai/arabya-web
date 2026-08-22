import type { LughawiEdit } from "@/lib/lughawi/types";

/** Browser-safe: apply one accept/reject without Node fs. */
export function applySingleEdit(
  text: string,
  edits: LughawiEdit[],
  editId: string,
  decision: "accepted" | "rejected",
  /** When accepting, optional user-typed replacement instead of engine suggestion. */
  customTo?: string,
): { text: string; edits: LughawiEdit[] } {
  const target = edits.find((e) => e.id === editId);
  if (!target) return { text, edits };

  if (decision === "rejected") {
    return {
      text,
      edits: edits.map((e) =>
        e.id === editId ? { ...e, status: "rejected" as const } : e,
      ),
    };
  }

  const replacement = (customTo?.trim() || target.suggestion).trim();
  if (!replacement || replacement === text.slice(target.start, target.end)) {
    return {
      text,
      edits: edits.filter((e) => e.id !== editId),
    };
  }

  const delta = replacement.length - (target.end - target.start);
  const nextText =
    text.slice(0, target.start) + replacement + text.slice(target.end);

  const nextEdits = edits
    .filter((e) => e.id !== editId)
    .map((e) => {
      if (e.end <= target.start) return e;
      if (e.start >= target.end) {
        return {
          ...e,
          start: e.start + delta,
          end: e.end + delta,
        };
      }
      return null;
    })
    .filter(Boolean) as LughawiEdit[];

  return {
    text: nextText,
    edits: nextEdits.map((e) => ({ ...e, status: "proposed" as const })),
  };
}
