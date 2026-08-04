"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SiteAppearance } from "@/lib/site-appearance";
import {
  applyCreditPlaceholders,
  DEFAULT_SITE_APPEARANCE,
} from "@/lib/site-appearance";

export function AdminAppearancePanel() {
  const t = useTranslations("Admin");
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const [source, setSource] = useState<"cloud" | "file">("file");
  const [syncConfigured, setSyncConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/appearance", { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          appearance?: SiteAppearance;
          source?: "cloud" | "file";
          syncConfigured?: boolean;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.appearance) {
          throw new Error(data.error || t("appearanceLoadError"));
        }
        if (cancelled) return;
        setAr(data.appearance.footerCreditAr);
        setEn(data.appearance.footerCreditEn);
        setSource(data.source || "file");
        setSyncConfigured(Boolean(data.syncConfigured));
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("appearanceLoadError"));
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ footerCreditAr: ar, footerCreditEn: en }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        appearance?: SiteAppearance;
        source?: "cloud" | "file";
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.appearance) {
        throw new Error(
          data.message ||
            (data.error === "cloud_required"
              ? t("appearanceCloudRequired")
              : data.error) ||
            t("appearanceSaveError"),
        );
      }
      setAr(data.appearance.footerCreditAr);
      setEn(data.appearance.footerCreditEn);
      setSource(data.source || source);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("appearanceSaveError"));
    } finally {
      setBusy(false);
    }
  }

  function resetDefaults() {
    setAr(DEFAULT_SITE_APPEARANCE.footerCreditAr);
    setEn(DEFAULT_SITE_APPEARANCE.footerCreditEn);
    setSaved(false);
  }

  if (!loaded) {
    return <p className="dash-muted">{t("appearanceLoading")}</p>;
  }

  return (
    <form className="dash-stack appearance-form" onSubmit={(e) => void onSave(e)}>
      <p className="dash-muted">{t("appearanceLead")}</p>
      <p className="dash-muted">
        {t("appearanceSource", {
          source: source === "cloud" ? t("appearanceSourceCloud") : t("appearanceSourceFile"),
        })}
        {!syncConfigured ? ` · ${t("appearanceSyncHint")}` : null}
      </p>

      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
      {saved ? <p className="dash-banner">{t("appearanceSaved")}</p> : null}

      <label className="appearance-field">
        <span>{t("appearanceCreditAr")}</span>
        <textarea
          value={ar}
          onChange={(e) => {
            setAr(e.target.value);
            setSaved(false);
          }}
          rows={2}
          maxLength={240}
          dir="rtl"
          required
        />
        <span className="dash-muted appearance-preview">
          {t("appearancePreview")}: {applyCreditPlaceholders(ar || "…", year)}
        </span>
      </label>

      <label className="appearance-field">
        <span>{t("appearanceCreditEn")}</span>
        <textarea
          value={en}
          onChange={(e) => {
            setEn(e.target.value);
            setSaved(false);
          }}
          rows={2}
          maxLength={240}
          dir="ltr"
          required
        />
        <span className="dash-muted appearance-preview">
          {t("appearancePreview")}: {applyCreditPlaceholders(en || "…", year)}
        </span>
      </label>

      <p className="dash-muted">{t("appearanceYearHint")}</p>

      <div className="dash-actions">
        <button
          type="submit"
          className="auth-btn auth-btn--google"
          disabled={busy}
        >
          {busy ? t("appearanceSaving") : t("appearanceSave")}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--ghost"
          disabled={busy}
          onClick={resetDefaults}
        >
          {t("appearanceReset")}
        </button>
      </div>
    </form>
  );
}
