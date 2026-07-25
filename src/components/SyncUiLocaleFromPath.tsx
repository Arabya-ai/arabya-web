"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { persistUiLocale } from "@/components/LocaleSwitcher";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

/**
 * Keep localStorage in sync with the URL locale so account/header
 * preferences match what the user is actually viewing.
 */
export function SyncUiLocaleFromPath() {
  const locale = useLocale();

  useEffect(() => {
    if (!isAppLocale(locale)) return;
    persistUiLocale(locale as AppLocale);
  }, [locale]);

  return null;
}
