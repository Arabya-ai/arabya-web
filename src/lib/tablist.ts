/**
 * Roving-tabindex keyboard navigation for an RTL tablist.
 *
 * Returns the index of the tab that keyboard focus should move to for a given
 * key, or `null` when the key should be ignored. Because the tablist is laid
 * out right-to-left, ArrowRight moves to the previous tab and ArrowLeft moves
 * to the next tab, matching the WAI-ARIA authoring practices for RTL.
 */
export function nextTabIndex(
  key: string,
  index: number,
  count: number,
): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowRight":
      return (index - 1 + count) % count;
    case "ArrowLeft":
      return (index + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
