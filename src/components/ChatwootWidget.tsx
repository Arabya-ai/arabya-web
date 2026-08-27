"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    chatwootSDK?: {
      run: (opts: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      toggle?: (state?: "open" | "close") => void;
    };
  }
}

/**
 * Chatwoot live-support widget — browser-only, SSR-safe.
 * No-ops when token/base URL unset or script fails (graceful degradation).
 */
export function ChatwootWidget() {
  useEffect(() => {
    const websiteToken = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN?.trim();
    const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL?.trim().replace(
      /\/$/,
      "",
    );
    if (!websiteToken || !baseUrl) return;

    const scriptId = "arabya-chatwoot-sdk";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.onload = () => {
      try {
        window.chatwootSDK?.run({ websiteToken, baseUrl });
      } catch {
        // Keep core site usable if Chatwoot is down.
      }
    };
    script.onerror = () => {
      script.remove();
    };
    document.body.appendChild(script);

    return () => {
      // Leave SDK in place across soft navigations; only remove on full unmount if needed.
    };
  }, []);

  return null;
}
