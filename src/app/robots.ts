import type { MetadataRoute } from "next";

/**
 * Canonical robots policy for arabya.org (Next.js source of truth).
 *
 * If Cloudflare "Managed robots.txt" or a custom CF Workers override differs
 * from this file, disable/align that override so crawlers see one policy
 * (audit H-02). Public pages stay allow; private surfaces stay disallow.
 */
const DISALLOW = [
  "/api/",
  "/admin/",
  "/account/",
  "/studio/",
  "/login",
  "/en/login",
  "/en/admin/",
  "/en/account/",
  "/en/studio/",
  "/create/",
  "/tahfeez/",
  "/_next/",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...DISALLOW],
    },
    sitemap: "https://www.arabya.org/sitemap.xml",
    host: "https://www.arabya.org",
  };
}
