import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

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

function resolveUiLocale(
  pathname: string,
  preferred: string | undefined,
): "ar" | "en" {
  if (pathname.startsWith("/en")) return "en";
  if (preferred === "en" || preferred === "ar") return preferred;
  return "ar";
}

function isProtectedPath(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return /^(?:\/(?:account|studio|admin|create))(?:\/|$)/.test(bare);
}

function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.includes(".")
  );
}

function setLocaleCookie(res: NextResponse, locale: "ar" | "en"): void {
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_MAX_AGE,
    sameSite: "lax",
  });
}

export default auth((req) => {
  const request = req as unknown as NextRequest;
  const { pathname } = request.nextUrl;

  if (isStaticOrApi(pathname)) {
    return NextResponse.next();
  }

  const preferred = request.cookies.get(LOCALE_COOKIE)?.value;

  // Never expose /ar/… publicly — Arabic stays at the unprefixed root.
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/ar" ? "/" : pathname.slice(3);
    return NextResponse.redirect(url);
  }

  /**
   * Preference rules:
   * - Cookie `en` + unprefixed URL → send to `/en…` (sticky English).
   * - Explicit `/en…` always wins (never bounce back to Arabic because cookie is `ar`).
   *   Visiting `/en` also updates the cookie to `en`.
   * - Switching to Arabic is done via the language switcher (sets cookie `ar` + navigates).
   */
  if (preferred === "en" && !pathname.startsWith("/en")) {
    const url = request.nextUrl.clone();
    url.pathname = withLocalePrefix(pathname, "en");
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && !req.auth) {
    const locale = resolveUiLocale(pathname, preferred);
    const returnTo = `${pathname}${request.nextUrl.search}`;
    const url = request.nextUrl.clone();
    url.pathname = withLocalePrefix("/login", locale);
    // Drop original query (e.g. ?s=&v=) so only callbackUrl carries the return path.
    url.search = "";
    url.searchParams.set("callbackUrl", returnTo);
    return NextResponse.redirect(url);
  }

  const response = intlMiddleware(request);

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    if (preferred !== "en") setLocaleCookie(response, "en");
  }

  return response;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
