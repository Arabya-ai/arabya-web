import type { ReactNode } from "react";

/**
 * Mushaf segment extras — preload Quran font so page text can paint as LCP
 * without waiting for CSS discovery of @font-face.
 */
export default function MushafLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link
        rel="preload"
        href="/fonts/UthmanicHafs.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {children}
    </>
  );
}
