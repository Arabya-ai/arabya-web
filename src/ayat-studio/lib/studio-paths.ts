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

/** Legacy helper — Studio now uses site header/footer; kept for callers. */
export function isAyatStudioPath(pathname: string): boolean {
  void pathname;
  return false;
}
