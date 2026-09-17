"use client";

import Script from "next/script";

/**
 * Privacy-first Umami tracker — lazy after hydration.
 * No-ops when website id / script URL unset (graceful degradation).
 */
export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim();
  if (!websiteId || !scriptUrl) return null;

  return (
    <Script
      id="arabya-umami"
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="lazyOnload"
      onError={() => {
        // Swallow — analytics must never blank the page.
      }}
    />
  );
}
