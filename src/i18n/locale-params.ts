import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
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

/** Locale-aware redirect for server components (auth gates, etc.). */
export function redirectLocalized(href: string, locale: AppLocale): never {
  redirect({ href, locale });
  throw new Error("redirectLocalized: unreachable");
}
