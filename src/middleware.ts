import createMiddleware from "next-intl/middleware";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { routing } from "@/i18n/routing";
import { ARABYA_SITE_HOST } from "@/lib/brand-export";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

/** Primary public host; legacy .com and apex .org redirect here. */
const CANONICAL_HOST = `www.${ARABYA_SITE_HOST}`;
const LEGACY_HOSTS = new Set([
  ARABYA_SITE_HOST,
  "arabyaai.com",
  "www.arabyaai.com",
]);

function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || host === CANONICAL_HOST) return null;
  if (host === "localhost" || host.endsWith(".vercel.app")) return null;
  if (!LEGACY_HOSTS.has(host)) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  url.port = "";
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
    pathname.includes(".")
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

  const { pathname } = request.nextUrl;

  if (isStaticOrApi(pathname)) {
    return NextResponse.next();
  }

  return runPublicMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
