/** Class applied to Radix portals so studio CSS tokens resolve outside `.ayat-studio`. */
export const STUDIO_PORTAL_CLASS = "ayat-studio-portal";

export function getStudioPortalContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined;
  // Body keeps Radix menus above all studio stacking/overflow contexts on mobile.
  return document.body;
}
