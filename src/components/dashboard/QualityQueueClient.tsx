"use client";

import { useEffect, useState } from "react";
import type { QualityQueueItem } from "@/lib/quality-scan";

export function QualityQueueClient({
  initialItems,
  autoScan = false,
}: {
  initialItems: QualityQueueItem[];
  autoScan?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(initialItems.length > 0);

  async function rescan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/quality-scan", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        items?: QualityQueueItem[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل الفحص");
      setItems(data.items || []);
      setScanned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoScan) void rescan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan]);

  return (
    <div className="dash-stack">
      <div className="dash-actions">
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void rescan()}
        >
          {busy ? "جاري الفحص…" : scanned ? "إعادة الفحص الآن" : "تشغيل الفحص"}
        </button>
        <span className="dash-muted" style={{ margin: 0 }}>
          العناصر: {items.length}
        </span>
      </div>
      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
      {busy && !scanned ? (
        <section className="dash-card">
          <p className="dash-muted">جاري فحص السور والإعراب وفهرس المصحف…</p>
        </section>
      ) : null}
      {!busy && scanned && items.length === 0 ? (
        <section className="dash-card">
          <h2>لا مشكلات مكتشفة حاليًا</h2>
          <p className="dash-muted">
            اكتمل فحص السور والإعراب وفهرس المصحف دون أخطاء ظاهرة.
          </p>
        </section>
      ) : null}
      {items.map((item) => (
        <article key={item.id} className="dash-card">
          <p className="dash-kicker">أولوية: {item.priority}</p>
          <h2>{item.title}</h2>
          <p className="dash-muted">{item.surahHint}</p>
          <p>{item.note}</p>
        </article>
      ))}
    </div>
  );
}
