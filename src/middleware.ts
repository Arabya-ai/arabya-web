import createMiddleware from "next-intl/middleware";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

/** Primary public host (.org). Auth + signed-in surfaces stay here. */
const AUTH_HOST = "www.arabya.org";
const ALT_WWW_HOST = "www.arabyaai.com";

/** Both domains serve the same app on Contabo (apex → www per domain). */
const PRIMARY_HOSTS = new Set([AUTH_HOST, ALT_WWW_HOST]);

const APEX_TO_WWW: Record<string, string> = {
  "arabya.org": AUTH_HOST,
  "arabyaai.com": ALT_WWW_HOST,
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
 * Google OAuth + session cookies are bound to AUTH_URL (www.arabya.org).
 * When OLS eventually serves .com natively, bounce login/OAuth to .org.
 * (Cloudflare Worker already does this while the Host bridge is active.)
 */
function altDomainAuthRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== ALT_WWW_HOST && host !== "arabyaai.com") return null;

  const { pathname } = request.nextUrl;
  const authSurface =
    pathname === "/login" ||
    pathname === "/en/login" ||
    pathname.startsWith("/api/auth");

  if (!authSurface) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = AUTH_HOST;
  url.port = "";
  return NextResponse.redirect(url, 302);
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
    /\.(?:ico|png|jpe?g|gif|webp|svg|css|js|map|txt|xml|json|woff2?|ttf|webmanifest)$/i.test(
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

  const authRedirect = altDomainAuthRedirect(request);
  if (authRedirect) return authRedirect;

  const { pathname } = request.nextUrl;

  if (isStaticOrApi(pathname)) {
    return NextResponse.next();
  }

  return runPublicMiddleware(request);
}

export const config = {
  // Include /api/auth so alt-domain OAuth is redirected to AUTH_HOST.
  // Do not treat emails in CRM paths (user@domain.com) as static files.
  matcher: [
    "/api/auth/:path*",
    "/((?!api|_next|.*\\.(?:ico|png|jpe?g|gif|webp|svg|css|js|map|txt|xml|json|woff2?|ttf|webmanifest)$).*)",
  ],
};
