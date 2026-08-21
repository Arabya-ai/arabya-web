import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Next 15.5 ships `next/dist/compiled/webpack/webpack` where `WebpackError`
 * lives on `.webpack` after `init()`, but minify-webpack-plugin reads
 * `_webpack.WebpackError` on the module exports. When minification fails,
 * Contabo builds collapse into:
 *   TypeError: __webpack.WebpackError is not a constructor
 * Hoist the constructor once so the real minify error (if any) can surface.
 */
function hoistWebpackErrorConstructor(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const w = require("next/dist/compiled/webpack/webpack") as {
      init?: () => void;
      WebpackError?: unknown;
      webpack?: { WebpackError?: unknown };
    };
    if (typeof w.init === "function") w.init();
    if (
      typeof w.WebpackError !== "function" &&
      typeof w.webpack?.WebpackError === "function"
    ) {
      w.WebpackError = w.webpack.WebpackError;
    }
  } catch {
    /* ignore — build will fail loudly later if webpack is truly broken */
  }
}
hoistWebpackErrorConstructor();

/**
 * CSP allows self + Google fonts + Quran audio CDNs + Cloudflare Insights.
 * Theme bootstrap uses a tiny inline script → 'unsafe-inline' for script/style.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "form-action 'self' https://accounts.google.com",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://browser.sentry-cdn.com https://js.sentry-cdn.com",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // blob: Studio preview/export; https: Pexels/Vimeo CDN fallbacks for <video>
  "media-src 'self' blob: data: https:",
  "connect-src 'self' https://cloudflareinsights.com https://*.ingest.sentry.io https://*.sentry.io https://api.quran.com https://accounts.google.com https://images.pexels.com https://videos.pexels.com https://player.vimeo.com https://cdn.pixabay.com https://pixabay.com https://i.vimeocdn.com",
  "frame-src 'self' https://drive.google.com https://docs.google.com blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self), payment=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next 16 removed `eslint` from next.config — lint stays in CI via `npm run lint`.
  serverExternalPackages: ["@resvg/resvg-js", "better-sqlite3"],
  experimental: {
    // Next 15.5.x Contabo/self-host: minify-webpack-plugin can throw
    //   TypeError: __webpack.WebpackError is not a constructor
    // when wrapping an underlying minify failure (often Node 24 / OOM).
    // Disable server minify; client still minifies via SWC.
    serverMinification: false,
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
  webpack: (config) => {
    // Re-run hoist inside the webpack compile process (separate from config eval).
    hoistWebpackErrorConstructor();
    return config;
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

export default withSentryConfig(withNextIntl(nextConfig), {
  // Contabo: never require Vercel monitors; source maps upload only with token
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  telemetry: false,
  // Prefer nested webpack options (top-level disableLogger / automaticVercelMonitors are deprecated).
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});
