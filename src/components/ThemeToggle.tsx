"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  type Theme,
} from "@/lib/theme";

function SunIcon() {
  return (
    <span className="theme-toggle-icon" aria-hidden>
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </span>
  );
}

function MoonIcon() {
  return (
    <span className="theme-toggle-icon" aria-hidden>
      <svg viewBox="0 0 24 24">
        <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
      </svg>
    </span>
  );
}

/** Standalone theme control — prefer PreferencesMenu in site chrome. */
export function ThemeToggle() {
  const t = useTranslations("Theme");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = readStoredTheme();
    setTheme(next);
    applyTheme(next);
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  }, []);

  if (!ready) {
    return (
      <button type="button" className="theme-toggle" aria-hidden tabIndex={-1}>
        <MoonIcon />
        <span>{t("dark")}</span>
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      aria-pressed={isDark}
      title={isDark ? t("titleLight") : t("titleDark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span>{isDark ? t("light") : t("dark")}</span>
    </button>
  );
}
