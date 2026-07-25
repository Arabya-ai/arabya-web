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

/** Immersive Arabya Studio chrome (no site header/footer). */
export function isAyatStudioPath(pathname: string): boolean {
  const bare = pathname.startsWith("/en/")
    ? pathname.slice(3)
    : pathname === "/en"
      ? "/"
      : pathname;
  if (bare === "/create" || bare.startsWith("/create/")) return true;
  if (bare === "/studio") return true;
  if (bare.startsWith("/studio/queue") || bare.startsWith("/studio/sources")) {
    return false;
  }
  return bare.startsWith("/studio/");
}
