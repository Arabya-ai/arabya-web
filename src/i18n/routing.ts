import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ar";

export const rtlLocales: readonly AppLocale[] = ["ar"];

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export function localeDirection(locale: AppLocale): "rtl" | "ltr" {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

/**
 * Arabic (default) stays at `/…` with no prefix.
 * English lives under `/en/…`.
 * localeDetection is off so first visits stay Arabic (site primary language).
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});
