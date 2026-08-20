import type { LughawiEdit } from "@/lib/lughawi/types";

function overlaps(a: LughawiEdit, b: LughawiEdit): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Merge stage edits with non-overlapping spans; earlier stages win. */
export function mergeEdits(stages: LughawiEdit[][]): LughawiEdit[] {
  const accepted: LughawiEdit[] = [];
  for (const stage of stages) {
    for (const edit of stage) {
      if (accepted.some((e) => overlaps(e, edit))) continue;
      accepted.push(edit);
    }
  }
  return accepted.sort((a, b) => a.start - b.start || b.end - a.end);
}

export function applyEdits(text: string, edits: LughawiEdit[]): string {
  const sorted = [...edits]
    .filter((e) => e.status !== "rejected")
    .sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.suggestion + out.slice(e.end);
  }
  return out;
}
