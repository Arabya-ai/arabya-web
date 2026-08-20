import { collapseDuplicatePathSlashes } from "@/lib/path-normalize";
import createMiddleware from "next-intl/middleware";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { routing } from "@/i18n/routing";
import { enforceApiBaseline } from "@/lib/rate-limit";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

/** Both domains serve the same app on Contabo (apex → www per domain). */
const PRIMARY_HOSTS = new Set([
  "www.arabya.org",
  "www.arabyaai.com",
]);

const APEX_TO_WWW: Record<string, string> = {
  "arabya.org": "www.arabya.org",
  "arabyaai.com": "www.arabyaai.com",
};

function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || PRIMARY_HOSTS.has(host)) return null;
  if (host === "localhost") return null;

  const wwwTarget = APEX_TO_WWW[host];
  if (!wwwTarget) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = wwwTarget;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

/**
 * Collapse duplicate path slashes.
 * Duplicate slashes make the History API treat the path as a protocol-relative
 * URL (`https://lughawi/`), which crashes the client (SecurityError / replaceState).
 */
function duplicateSlashRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.includes("//")) return null;
  const nextPath = collapseDuplicatePathSlashes(pathname);
  if (nextPath === pathname) return null;
  const url = request.nextUrl.clone();
  url.pathname = nextPath;
  return NextResponse.redirect(url, 308);
}

function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return pathname.slice(3) || "/";
  }
  return pathname;
}

function withLocalePrefix(pathname: string, locale: "ar" | "en"): string {
  const bare = stripLocalePrefix(pathname);
  if (locale === "ar") return bare;
  return bare === "/" ? "/en" : `/en${bare}`;
}

function setLocaleCookie(res: NextResponse, locale: "ar" | "en"): void {
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_MAX_AGE,
    sameSite: "lax",
  });
}

function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    /\.(?:ico|png|jpe?g|gif|webp|svg|css|js|map|txt|xml|json|woff2?|ttf|webmanifest|pdf)$/i.test(
      pathname,
    )
  );
}

/** Locale redirects + intl — auth gates live in server layouts/pages (Node). */
function runPublicMiddleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const preferred = request.cookies.get(LOCALE_COOKIE)?.value;

  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/ar" ? "/" : pathname.slice(3);
    return NextResponse.redirect(url);
  }

  if (preferred === "en" && !pathname.startsWith("/en")) {
    const url = request.nextUrl.clone();
    url.pathname = withLocalePrefix(pathname, "en");
    return NextResponse.redirect(url);
  }

  const response = intlMiddleware(request);

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    if (preferred !== "en") setLocaleCookie(response, "en");
  }

  return response;
}

export default function middleware(request: NextRequest) {
  const hostRedirect = canonicalHostRedirect(request);
  if (hostRedirect) return hostRedirect;

  const slashRedirect = duplicateSlashRedirect(request);
  if (slashRedirect) return slashRedirect;

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    const limited = enforceApiBaseline(request);
    if (limited) return limited;
    return NextResponse.next();
  }

  if (isStaticOrApi(pathname)) {
    return NextResponse.next();
  }

  return runPublicMiddleware(request);
}

export const config = {
  // Do not treat emails in CRM paths (user@domain.com) as static files.
  matcher: [
    "/api/:path*",
    "/((?!_next|.*\\.(?:ico|png|jpe?g|gif|webp|svg|css|js|map|txt|xml|json|woff2?|ttf|webmanifest|pdf)$).*)",
  ],
};
