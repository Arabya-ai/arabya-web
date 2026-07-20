/**
 * Runtime fallback: normalize uthmani Unicode to QPC-Hafs encoding for UthmanicHafs font.
 * Primary fix is data/surahs/*.json using text_qpc_hafs from apply-qpc-hafs-text.mjs.
 */
export function normalizeForHafsFont(text: string): string {
  return (
    text
      // Silent-letter marker (shows as dotted circle in most browsers)
      .replace(/\u06DF/g, "\u0652")
      // Misused end-of-ayah sign in tanween contexts
      .replace(/\u06ED/g, "\u0657")
      // Collapse waqf marks spacing
      .replace(/\s+([\u06D6-\u06DC\u06DF-\u06ED])/g, "$1")
      .replace(/([\u06D6-\u06DC\u06DF-\u06ED])\s+/g, "$1")
  );
}
