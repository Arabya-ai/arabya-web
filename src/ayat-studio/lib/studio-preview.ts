/** Helpers for live studio preview ayah indexing. */

export function clampAyahPreviewIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, index), count - 1);
}

/** Fit a w×h aspect box inside container without overflow. */
export function fitAspectBox(
  containerW: number,
  containerH: number,
  aspectW: number,
  aspectH: number,
): { width: number; height: number } {
  if (containerW <= 0 || containerH <= 0 || aspectW <= 0 || aspectH <= 0) {
    return { width: 0, height: 0 };
  }
  const targetAspect = aspectW / aspectH;
  const containerAspect = containerW / containerH;
  if (containerAspect > targetAspect) {
    const height = containerH;
    return { width: height * targetAspect, height };
  }
  const width = containerW;
  return { width, height: width / targetAspect };
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
