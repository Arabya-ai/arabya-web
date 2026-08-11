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

/** Match Tailwind `lg` — stacked controls/preview below this width. */
export const STUDIO_STACKED_LAYOUT_MAX_PX = 1023;

/**
 * Size the live preview frame for the current layout.
 * Stacked (phone/tablet): fill stage width first so 9:16 is not tiny;
 * the editor page can scroll. Side-by-side (desktop): fit inside stage
 * height with a viewport cap so the locked editor shell does not overflow.
 */
export function measurePreviewFrame(opts: {
  stageW: number;
  stageH: number;
  aspectW: number;
  aspectH: number;
  viewportH: number;
  stacked: boolean;
  /** Desktop max fraction of viewport height (editor shell locked). */
  desktopViewportRatio?: number;
  /** Stacked soft max fraction of viewport height. */
  stackedViewportRatio?: number;
}): { width: number; height: number } {
  const {
    stageW,
    stageH,
    aspectW,
    aspectH,
    viewportH,
    stacked,
    desktopViewportRatio = 0.68,
    stackedViewportRatio = 0.9,
  } = opts;
  if (stageW <= 0 || aspectW <= 0 || aspectH <= 0) {
    return { width: 0, height: 0 };
  }

  if (stacked) {
    // Prefer full stage width; soft-cap height so portrait frames stay usable.
    const softMaxH = Math.max(320, viewportH * stackedViewportRatio);
    return fitAspectBox(stageW, softMaxH, aspectW, aspectH);
  }

  const viewportCap = Math.max(240, viewportH * desktopViewportRatio);
  const usableH = Math.min(
    stageH > 0 ? stageH : viewportCap,
    viewportCap,
  );
  return fitAspectBox(stageW, Math.max(usableH, 1), aspectW, aspectH);
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
