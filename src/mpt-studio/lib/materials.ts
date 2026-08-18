import { unwrapData } from "@/mpt-studio/lib/client";

export type MptMaterialFile = {
  name: string;
  file: string;
  size?: number;
};

const SAFE_FILE = /^[A-Za-z0-9._-]+$/;

/** MoviePy stills converted to clips, e.g. `1.png.mp4`. */
export function isMoviePyIntermediate(file: string): boolean {
  return /\.(png|jpe?g|gif|webp)\.mp4$/i.test(file);
}

export function isImageMaterial(file: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(file) && !isMoviePyIntermediate(file);
}

/** Bundled MoneyPrinterTurbo test stills (`1.png` … `9.png`). */
export function isEngineSampleMaterial(file: string): boolean {
  return /^\d+\.png$/i.test(file);
}

export function materialThumbPath(file: string): string {
  return `/api/studio/ai/materials/thumb?file=${encodeURIComponent(file)}`;
}

export function parseMptMaterials(json: unknown): MptMaterialFile[] {
  const data = unwrapData(json) as { files?: unknown };
  if (!Array.isArray(data?.files)) return [];
  const out: MptMaterialFile[] = [];
  for (const item of data.files.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const file = String(rec.file || rec.name || "").trim();
    if (!file || !SAFE_FILE.test(file)) continue;
    if (isMoviePyIntermediate(file)) continue;
    const size = typeof rec.size === "number" ? rec.size : undefined;
    out.push({ name: String(rec.name || file), file, size });
  }
  return out;
}

/** Skip MoviePy intermediates like `1.png.mp4` when picking defaults. */
export function preferredLocalMaterials(files: MptMaterialFile[]): MptMaterialFile[] {
  const originals = files.filter((item) => !isMoviePyIntermediate(item.file));
  return originals.length ? originals : files;
}
