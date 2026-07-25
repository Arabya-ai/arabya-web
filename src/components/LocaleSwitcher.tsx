"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import {
  defaultLocale,
  isAppLocale,
  locales,
  type AppLocale,
} from "@/i18n/routing";

const COOKIE = "NEXT_LOCALE";

const LOCALE_BADGES: Record<AppLocale, string> = {
  ar: "AR",
  en: "EN",
};

export function persistUiLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(STORAGE_KEYS.uiLocale, locale);
  } catch {
    /* ignore */
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE}=${locale};path=/;max-age=${maxAge};samesite=lax`;
  } catch {
    /* ignore */
  }
}

export function readStoredUiLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.uiLocale);
    if (raw && isAppLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return defaultLocale;
}

function LanguageIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

type Props = {
  className?: string;
  /** Compact trigger for header bar */
  compact?: boolean;
};

/**
 * Language dropdown: globe icon → menu with flag + language name.
 * Works for visitors without login (cookie + path).
 */
export function LocaleSwitcher({ className = "", compact = false }: Props) {
  const t = useTranslations("Locale");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (next: AppLocale) => {
    setOpen(false);
    if (next === locale) return;
    persistUiLocale(next);
    router.replace(pathname, { locale: next });
  };

  return (
    <div
      className={`nav-dropdown locale-switch ${open ? "is-open" : ""} ${compact ? "locale-switch--compact" : ""} ${className}`.trim()}
      ref={rootRef}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="locale-switch-trigger nav-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("switchTo")}
        title={t("switchTo")}
        onClick={() => setOpen((v) => !v)}
      >
        <LanguageIcon />
        <span className="locale-switch-trigger-flag" aria-hidden>
          {LOCALE_BADGES[locale]}
        </span>
        {!compact ? (
          <span className="locale-switch-trigger-text">{t("label")}</span>
        ) : (
          <span className="sr-only">{t("label")}</span>
        )}
      </button>
      <div className="nav-dropdown-menu locale-switch-menu" role="menu">
        {locales.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              lang={code}
              className={`locale-switch-option${active ? " is-active" : ""}`}
              onClick={() => select(code)}
            >
              <span className="locale-switch-option-flag" aria-hidden>
                {LOCALE_BADGES[code]}
              </span>
              <span>{t(code)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
