export const MPT_STUDIO_BASE = "/studio/ai" as const;

/** Independent AI-video routes — not mixed with `/studio/editor`. */
export function mptStudioPath(path = ""): string {
  if (!path || path === "/") return MPT_STUDIO_BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === MPT_STUDIO_BASE || p.startsWith(`${MPT_STUDIO_BASE}/`)) return p;
  return `${MPT_STUDIO_BASE}${p}`;
}

export function isMptStudioPath(pathname: string): boolean {
  return (
    pathname === MPT_STUDIO_BASE || pathname.startsWith(`${MPT_STUDIO_BASE}/`)
  );
}
