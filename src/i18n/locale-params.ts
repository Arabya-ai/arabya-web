import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  defaultLocale,
  isAppLocale,
  type AppLocale,
} from "@/i18n/routing";

export type LocaleParams = { params: Promise<{ locale: string }> };

/** Resolve `[locale]` param, set request locale, return typed locale. */
export async function resolveLocale(
  params: Promise<{ locale: string }>,
): Promise<AppLocale> {
  const { locale: raw } = await params;
  const locale: AppLocale = isAppLocale(raw) ? raw : defaultLocale;
  setRequestLocale(locale);
  return locale;
}

/** Prefix a path for the active locale (Arabic has no prefix). */
export function localizedHref(href: string, locale: AppLocale): string {
  const bare = href.startsWith("/") ? href : `/${href}`;
  if (locale === defaultLocale) return bare;
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}

/** Locale-aware redirect for server components (auth gates, etc.). */
export function redirectLocalized(href: string, locale: AppLocale): never {
  // Use next/navigation — next-intl's redirect() can render a 404 HTML body
  // on 307 responses for auth-gated App Router layouts.
  redirect(localizedHref(href, locale));
}
