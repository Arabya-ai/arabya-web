/** Studio shell route helpers */

export function isStudioEditorPath(pathname: string): boolean {
  return (
    /(?:^|\/)studio\/editor(?:\/|$)/.test(pathname) ||
    /(?:^|\/)create\/editor(?:\/|$)/.test(pathname)
  );
}

/** Editor-only: lock viewport under site header (no page scroll). */
export function isStudioEditorViewportPath(pathname: string): boolean {
  return (
    pathname.startsWith("/studio/editor") ||
    pathname.startsWith("/create/editor")
  );
}
