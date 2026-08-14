import type { InfoHeroNavItem } from "@/components/info/InfoHeroNav";

/** Shared pill nav on About / Contact info pages. */
export function buildInfoHeroNavItems(t: (key: string) => string): InfoHeroNavItem[] {
  return [
    {
      href: "/mushaf/1",
      label: t("ctaMushaf"),
      primary: true,
      matchPrefix: "/mushaf",
    },
    {
      href: "/studio",
      label: t("ctaStudio"),
      matchPrefix: "/studio",
    },
    {
      href: "/privacy",
      label: t("ctaPrivacy"),
    },
    {
      href: "/terms",
      label: t("ctaTerms"),
    },
    {
      href: "/contact",
      label: t("ctaContact"),
    },
  ];
}
