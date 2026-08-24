import { STORAGE_KEYS } from "@/lib/storage-keys";

/** Accent palettes the visitor can pick (Warraq-style swatches). */
export const ARABYA_PALETTES = [
  "teal",
  "warraq",
  "emerald",
  "indigo",
  "rose",
  "amber",
  "sky",
  "slate",
] as const;

export type ArabyaPalette = (typeof ARABYA_PALETTES)[number];

export const DEFAULT_PALETTE: ArabyaPalette = "teal";

const PALETTE_KEY = STORAGE_KEYS.palette;

export function isArabyaPalette(value: string | null | undefined): value is ArabyaPalette {
  return (
    typeof value === "string" &&
    (ARABYA_PALETTES as readonly string[]).includes(value)
  );
}

export function applyPalette(palette: ArabyaPalette): void {
  document.documentElement.dataset.arabyaPalette = palette;
}

export function readStoredPalette(): ArabyaPalette {
  try {
    const saved = localStorage.getItem(PALETTE_KEY);
    if (isArabyaPalette(saved)) return saved;
    return DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function persistPalette(palette: ArabyaPalette): void {
  try {
    localStorage.setItem(PALETTE_KEY, palette);
  } catch {
    /* ignore */
  }
}

/** Swatch colors for the floating picker UI (light preview). */
export const PALETTE_SWATCHES: Record<ArabyaPalette, string> = {
  teal: "#0d9488",
  warraq: "#d4a017",
  emerald: "#059669",
  indigo: "#4f46e5",
  rose: "#e11d48",
  amber: "#d97706",
  sky: "#0284c7",
  slate: "#475569",
};
