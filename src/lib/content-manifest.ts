/**
 * Types for on-demand Quran content loading (mobile / CDN).
 * Do not ship the full ~148MB `/data` tree inside a native app package.
 */

export type ContentManifestEntry = {
  kind: "surah" | "tafsir" | "translation" | "irab" | "audio-timings";
  /** Surah id when applicable */
  surahId?: number;
  /** Edition / source slug (e.g. translation or tafsir) */
  edition?: string;
  /** Absolute or CDN-relative URL */
  url: string;
  /** Optional integrity hash */
  hash?: string;
  /** Byte size hint for download UI */
  size?: number;
};

export type ContentManifest = {
  version: number;
  baseUrl: string;
  entries: ContentManifestEntry[];
};
