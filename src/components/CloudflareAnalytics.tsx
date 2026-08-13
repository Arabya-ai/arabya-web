"use client";

import Script from "next/script";

/** Cloudflare Web Analytics — enabled when NEXT_PUBLIC_CF_BEACON_TOKEN is set. */
export function CloudflareAnalytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN?.trim();
  if (!token) return null;

  return (
    <Script
      id="cf-beacon"
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
      strategy="afterInteractive"
    />
  );
}
