import type { AppLocale } from "@/i18n/routing";

export type SiteAppearance = {
  footerCreditAr: string;
  footerCreditEn: string;
  updatedAt?: number | null;
  updatedBy?: string | null;
};

export const DEFAULT_SITE_APPEARANCE: SiteAppearance = {
  footerCreditAr: "© {year} منصة عربية · جميع الحقوق محفوظة لكل مسلم",
  footerCreditEn: "© {year} Arabya · All rights reserved for every Muslim",
};

const MAX_CREDIT_LEN = 240;

export function sanitizeCredit(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.slice(0, MAX_CREDIT_LEN);
}

export function normalizeSiteAppearance(
  raw: Partial<SiteAppearance> | null | undefined,
): SiteAppearance {
  return {
    footerCreditAr: sanitizeCredit(
      raw?.footerCreditAr,
      DEFAULT_SITE_APPEARANCE.footerCreditAr,
    ),
    footerCreditEn: sanitizeCredit(
      raw?.footerCreditEn,
      DEFAULT_SITE_APPEARANCE.footerCreditEn,
    ),
    updatedAt:
      typeof raw?.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : null,
    updatedBy:
      typeof raw?.updatedBy === "string" && raw.updatedBy.trim()
        ? raw.updatedBy.trim().toLowerCase()
        : null,
  };
}

export function applyCreditPlaceholders(
  template: string,
  year = new Date().getFullYear(),
): string {
  return template.replaceAll("{year}", String(year));
}

export function creditForLocale(
  appearance: SiteAppearance,
  locale: AppLocale | string,
  year = new Date().getFullYear(),
): string {
  const template =
    locale === "en" ? appearance.footerCreditEn : appearance.footerCreditAr;
  return applyCreditPlaceholders(template, year);
}
