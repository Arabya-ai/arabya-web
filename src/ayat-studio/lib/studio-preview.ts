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
 * Stacked (phone/tablet): fit a comfortable fraction of the viewport so
 * controls + preview stay usable without a huge scroll. Side-by-side
 * (desktop): fit inside stage height with a viewport cap.
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
  /** Stacked max fraction of viewport height for the frame. */
  stackedViewportRatio?: number;
  /** Stacked max fraction of stage width (keeps tablet frames from dominating). */
  stackedWidthRatio?: number;
}): { width: number; height: number } {
  const {
    stageW,
    stageH,
    aspectW,
    aspectH,
    viewportH,
    stacked,
    desktopViewportRatio = 0.68,
    stackedViewportRatio = 0.48,
    stackedWidthRatio = 0.72,
  } = opts;
  if (stageW <= 0 || aspectW <= 0 || aspectH <= 0) {
    return { width: 0, height: 0 };
  }

  if (stacked) {
    const softMaxH = Math.max(260, viewportH * stackedViewportRatio);
    const softMaxW = Math.max(160, stageW * stackedWidthRatio);
    return fitAspectBox(softMaxW, softMaxH, aspectW, aspectH);
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
