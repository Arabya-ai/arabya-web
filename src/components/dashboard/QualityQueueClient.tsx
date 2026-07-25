"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { QualityQueueItem } from "@/lib/quality-scan";
import { apiGet } from "@/lib/api-client";

export function QualityQueueClient({
  initialItems,
  autoScan = false,
}: {
  initialItems: QualityQueueItem[];
  autoScan?: boolean;
}) {
  const t = useTranslations("Studio");
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(initialItems.length > 0);

  const rescan = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiGet("/api/studio/quality-scan", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: QualityQueueItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || t("scanError"));
      setItems(data.items || []);
      setScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    if (autoScan) void rescan();
  }, [autoScan, rescan]);

  return (
    <div className="dash-stack">
      <div className="dash-actions">
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void rescan()}
        >
          {busy ? t("rescanBusy") : scanned ? t("rescanAgain") : t("runScan")}
        </button>
        <span className="dash-muted" style={{ margin: 0 }}>
          {t("itemCount", { count: items.length })}
        </span>
      </div>
      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
      {busy && !scanned ? (
        <section className="dash-card">
          <p className="dash-muted">{t("scanningLead")}</p>
        </section>
      ) : null}
      {!busy && scanned && items.length === 0 ? (
        <section className="dash-card">
          <h2>{t("noIssuesTitle")}</h2>
          <p className="dash-muted">{t("noIssuesLead")}</p>
        </section>
      ) : null}
      {items.map((item) => (
        <article key={item.id} className="dash-card">
          <p className="dash-kicker">{t("priority", { priority: item.priority })}</p>
          <h2>{item.title}</h2>
          <p className="dash-muted">{item.surahHint}</p>
          <p>{item.note}</p>
        </article>
      ))}
    </div>
  );
}
