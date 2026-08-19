"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  persistUiLocale,
  readStoredUiLocale,
} from "@/components/LocaleSwitcher";
import { ArabyaPanel } from "@/components/ui/ArabyaPanel";
import type { AppLocale } from "@/lib/plans";

/**
 * Account setting: UI language for all roles.
 * Default Arabic; persists locally and via NEXT_LOCALE cookie for middleware.
 */
export function AccountLanguagePanel() {
  const t = useTranslations("Account");
  const tLocale = useTranslations("Locale");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState<AppLocale>(locale);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setValue(readStoredUiLocale() || locale);
  }, [locale]);

  const save = (next: AppLocale) => {
    setValue(next);
    persistUiLocale(next);
    setNote(t("languageSaved"));
    window.setTimeout(() => setNote(null), 2000);
    if (next !== locale) {
      router.replace(pathname, { locale: next });
    }
  };

  return (
    <ArabyaPanel legacyDash id="ui-language" title={t("languageTitle")} muted={t("languageHint")}>
      <div className="dash-actions" role="group" aria-label={t("languageTitle")}>
        {(["ar", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            className={`account-panel-link${value === code ? " is-active" : ""}`}
            aria-pressed={value === code}
            onClick={() => save(code)}
          >
            {tLocale(code)}
          </button>
        ))}
      </div>
      {note ? <p className="dash-muted">{note}</p> : null}
    </ArabyaPanel>
  );
}
