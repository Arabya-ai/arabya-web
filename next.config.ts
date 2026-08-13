import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * CSP allows self + Google fonts + Quran audio CDNs + Vercel Analytics.
 * Theme bootstrap uses a tiny inline script → 'unsafe-inline' for script/style.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "form-action 'self' https://accounts.google.com",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // blob: Studio preview/export; https: Pexels/Vimeo CDN fallbacks for <video>
  "media-src 'self' blob: data: https:",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://api.quran.com https://accounts.google.com https://images.pexels.com https://videos.pexels.com https://player.vimeo.com https://cdn.pixabay.com https://pixabay.com https://i.vimeocdn.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "better-sqlite3"],
  experimental: {
    // Tree-shake heavy barrels so home/mushaf ship less unused JS.
    optimizePackageImports: [
      "lucide-react",
      "next-intl",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
