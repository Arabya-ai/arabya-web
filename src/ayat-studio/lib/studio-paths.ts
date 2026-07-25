export const STUDIO_BASE = "/create" as const;

export function studioPath(path: string): string {
  if (!path || path === "/") return STUDIO_BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/create")) return p;
  return `${STUDIO_BASE}${p}`;
}
