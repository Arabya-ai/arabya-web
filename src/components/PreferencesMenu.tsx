"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { persistUiLocale } from "@/components/LocaleSwitcher";
import { useDismissibleOpen } from "@/hooks/useDismissibleOpen";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  defaultLocale,
  isAppLocale,
  locales,
  type AppLocale,
} from "@/i18n/routing";
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  type Theme,
} from "@/lib/theme";
import {
  ARABYA_PALETTES,
  DEFAULT_PALETTE,
  PALETTE_SWATCHES,
  applyPalette,
  persistPalette,
  readStoredPalette,
  type ArabyaPalette,
} from "@/lib/palette";

const LOCALE_BADGES: Record<AppLocale, string> = {
  ar: "AR",
  en: "EN",
};

function PrefsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15rem"
      height="1.15rem"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1rem"
      height="1rem"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1rem"
      height="1rem"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
    </svg>
  );
}

type Props = {
  className?: string;
  /** Icon-only trigger for chrome bars */
  compact?: boolean;
  /** Open the panel upward (footer). */
  dropUp?: boolean;
};

/**
 * Single preferences control: language + light/dark theme.
 * Visibility is driven only by React `is-open` (no CSS focus-within trap).
 */
export function PreferencesMenu({
  className = "",
  compact = true,
  dropUp = false,
}: Props) {
  const t = useTranslations("Preferences");
  const tLocale = useTranslations("Locale");
  const tTheme = useTranslations("Theme");
  const tPalette = useTranslations("Palette");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const langLabelId = `${uid}-lang`;
  const themeLabelId = `${uid}-theme`;
  const paletteLabelId = `${uid}-palette`;
  const { open, setOpen, toggle } = useDismissibleOpen(rootRef);

  const [theme, setTheme] = useState<Theme>("light");
  const [themeReady, setThemeReady] = useState(false);
  const [palette, setPalette] = useState<ArabyaPalette>(DEFAULT_PALETTE);

  useEffect(() => {
    const next = readStoredTheme();
    setTheme(next);
    applyTheme(next);
    const nextPalette = readStoredPalette();
    setPalette(nextPalette);
    applyPalette(nextPalette);
    setThemeReady(true);
  }, []);

  const selectLocale = (next: AppLocale) => {
    if (!isAppLocale(next) || next === locale) {
      setOpen(false);
      return;
    }
    setOpen(false);
    persistUiLocale(next);
    router.replace(pathname, { locale: next });
  };

  const selectTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    persistTheme(next);
  };

  const selectPalette = (next: ArabyaPalette) => {
    setPalette(next);
    applyPalette(next);
    persistPalette(next);
  };

  const currentLocale = isAppLocale(locale) ? locale : defaultLocale;

  return (
    <div
      className={`prefs-menu ${open ? "is-open" : ""} ${compact ? "prefs-menu--compact" : ""} ${dropUp ? "prefs-menu--dropup" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className="prefs-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${uid}-panel`}
        aria-label={t("open")}
        title={t("open")}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        <PrefsIcon />
        <span className="prefs-menu-trigger-badge" aria-hidden>
          {LOCALE_BADGES[currentLocale]}
        </span>
        {!compact ? (
          <span className="prefs-menu-trigger-text">{t("label")}</span>
        ) : (
          <span className="sr-only">{t("label")}</span>
        )}
      </button>

      <div
        id={`${uid}-panel`}
        className="prefs-menu-panel"
        role="menu"
        hidden={!open}
      >
        <p className="prefs-menu-section-label" id={langLabelId}>
          {t("language")}
        </p>
        <div
          className="prefs-menu-options"
          role="group"
          aria-labelledby={langLabelId}
        >
          {locales.map((code) => {
            const active = currentLocale === code;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={code}
                className={`prefs-menu-option${active ? " is-active" : ""}`}
                onClick={() => selectLocale(code)}
              >
                <span className="prefs-menu-option-badge" aria-hidden>
                  {LOCALE_BADGES[code]}
                </span>
                <span>{tLocale(code)}</span>
              </button>
            );
          })}
        </div>

        <p className="prefs-menu-section-label" id={themeLabelId}>
          {t("appearance")}
        </p>
        <div
          className="prefs-menu-options"
          role="group"
          aria-labelledby={themeLabelId}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={themeReady && theme === "light"}
            className={`prefs-menu-option${theme === "light" ? " is-active" : ""}`}
            onClick={() => selectTheme("light")}
          >
            <SunIcon />
            <span>{tTheme("light")}</span>
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={themeReady && theme === "dark"}
            className={`prefs-menu-option${theme === "dark" ? " is-active" : ""}`}
            onClick={() => selectTheme("dark")}
          >
            <MoonIcon />
            <span>{tTheme("dark")}</span>
          </button>
        </div>

        <p className="prefs-menu-section-label" id={paletteLabelId}>
          {t("palette")}
        </p>
        <div
          className="prefs-menu-options prefs-menu-options--swatches"
          role="group"
          aria-labelledby={paletteLabelId}
        >
          {ARABYA_PALETTES.map((id) => {
            const active = palette === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`prefs-menu-swatch${active ? " is-active" : ""}`}
                style={{ background: PALETTE_SWATCHES[id] }}
                title={tPalette(`names.${id}`)}
                aria-label={tPalette(`names.${id}`)}
                onClick={() => selectPalette(id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
