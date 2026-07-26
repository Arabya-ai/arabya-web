/** Brand lockup placement for Studio preview + export. */

export type BrandPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const BRAND_POSITIONS: BrandPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

/** 3×3 pad order (visual LTR so corners match the video frame). */
export const BRAND_POSITION_PAD: BrandPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const BRAND_POSITION_LABELS_AR: Record<BrandPosition, string> = {
  "top-left": "أعلى اليسار",
  "top-center": "أعلى المنتصف",
  "top-right": "أعلى اليمين",
  "center-left": "منتصف اليسار",
  center: "المنتصف",
  "center-right": "منتصف اليمين",
  "bottom-left": "أسفل اليسار",
  "bottom-center": "أسفل المنتصف",
  "bottom-right": "أسفل اليمين",
};

export function normalizeBrandPosition(value: unknown): BrandPosition {
  if (
    typeof value === "string" &&
    (BRAND_POSITIONS as string[]).includes(value)
  ) {
    return value as BrandPosition;
  }
  return "bottom-left";
}

export type BrandAnchor = {
  /** Top-left of the lockup box */
  x: number;
  y: number;
  /** Flex direction hint for CSS */
  align: "start" | "center" | "end";
  justify: "start" | "center" | "end";
};

/** Compute top-left of a lockup box of size (boxW × boxH) inside (width × height). */
export function brandLockupAnchor(
  position: BrandPosition,
  width: number,
  height: number,
  boxW: number,
  boxH: number,
  pad: number,
): BrandAnchor {
  const maxX = Math.max(pad, width - pad - boxW);
  const maxY = Math.max(pad, height - pad - boxH);
  const midX = Math.round((width - boxW) / 2);
  const midY = Math.round((height - boxH) / 2);

  switch (position) {
    case "top-left":
      return { x: pad, y: pad, align: "start", justify: "start" };
    case "top-center":
      return { x: midX, y: pad, align: "center", justify: "start" };
    case "top-right":
      return { x: maxX, y: pad, align: "end", justify: "start" };
    case "center-left":
      return { x: pad, y: midY, align: "start", justify: "center" };
    case "center":
      return { x: midX, y: midY, align: "center", justify: "center" };
    case "center-right":
      return { x: maxX, y: midY, align: "end", justify: "center" };
    case "bottom-left":
      return { x: pad, y: maxY, align: "start", justify: "end" };
    case "bottom-center":
      return { x: midX, y: maxY, align: "center", justify: "end" };
    case "bottom-right":
      return { x: maxX, y: maxY, align: "end", justify: "end" };
    default:
      return { x: pad, y: maxY, align: "start", justify: "end" };
  }
}

/** Tailwind absolute classes for live preview lockup (LTR coords = video coords). */
export function brandPositionClass(position: BrandPosition): string {
  switch (position) {
    case "top-left":
      return "top-3 left-3";
    case "top-center":
      return "top-3 left-1/2 -translate-x-1/2";
    case "top-right":
      return "top-3 right-3";
    case "center-left":
      return "top-1/2 left-3 -translate-y-1/2";
    case "center":
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    case "center-right":
      return "top-1/2 right-3 -translate-y-1/2";
    case "bottom-left":
      return "bottom-3 left-3";
    case "bottom-center":
      return "bottom-3 left-1/2 -translate-x-1/2";
    case "bottom-right":
      return "bottom-3 right-3";
    default:
      return "bottom-3 left-3";
  }
}
