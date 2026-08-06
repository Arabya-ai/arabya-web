export const STUDIO_BASE = "/studio" as const;

/** Build an Arabya Studio path under `/studio` (legacy `/create` normalized). */
export function studioPath(path: string): string {
  if (!path || path === "/") return STUDIO_BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/studio")) return p === "/studio" ? STUDIO_BASE : p;
  if (p.startsWith("/create")) {
    const rest = p.slice("/create".length);
    return rest ? `${STUDIO_BASE}${rest}` : STUDIO_BASE;
  }
  return `${STUDIO_BASE}${p}`;
}

export type StudioCreateKind = "image" | "video";

/**
 * Deep-link into Studio new-project flow for a mushaf/ayah context.
 * Free plan included — Studio applies watermark/quota on export.
 */
export function studioCreateFromAyahHref(opts: {
  surahId: number;
  verse: number;
  kind?: StudioCreateKind;
  /** When true (default), NewProject auto-opens the editor. */
  auto?: boolean;
}): string {
  const sid = Math.min(114, Math.max(1, Math.trunc(opts.surahId) || 1));
  const verse = Math.max(1, Math.trunc(opts.verse) || 1);
  const sp = new URLSearchParams({
    s: String(sid),
    v: String(verse),
  });
  if (opts.kind) sp.set("kind", opts.kind);
  if (opts.auto !== false) sp.set("auto", "1");
  return `${STUDIO_BASE}/projects/new?${sp.toString()}`;
}

/** Legacy helper — Studio now uses site header/footer; kept for callers. */
export function isAyatStudioPath(pathname: string): boolean {
  void pathname;
  return false;
}
