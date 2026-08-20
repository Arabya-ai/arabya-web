/** Path helpers safe for unit tests (no Next runtime). */

/** Collapse `//lughawi` → `/lughawi` (fixes History SecurityError on // paths). */
export function collapseDuplicatePathSlashes(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  return collapsed.length === 0 ? "/" : collapsed;
}
