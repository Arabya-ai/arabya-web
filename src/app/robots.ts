import type { MetadataRoute } from "next";

/** Paths that must not be indexed (APIs, dashboards, auth). */
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
  };
}
