import type { LughawiEdit } from "@/lib/lughawi/types";

/** Browser-safe: apply one accept/reject without Node fs. */
export function applySingleEdit(
  text: string,
  edits: LughawiEdit[],
  editId: string,
  decision: "accepted" | "rejected",
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

  const delta = target.suggestion.length - (target.end - target.start);
  const nextText =
    text.slice(0, target.start) + target.suggestion + text.slice(target.end);

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
