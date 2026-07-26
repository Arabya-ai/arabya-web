/** Helpers for live studio preview ayah indexing. */

export function clampAyahPreviewIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, index), count - 1);
}

export function ayahIndexAtTime(
  segments: { start: number; end: number }[],
  timeSec: number,
): number {
  if (segments.length === 0) return 0;
  for (let i = 0; i < segments.length; i++) {
    if (timeSec >= segments[i].start && timeSec < segments[i].end) return i;
  }
  if (timeSec >= segments[segments.length - 1]!.end) {
    return segments.length - 1;
  }
  return 0;
}
