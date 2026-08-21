"use client";

import "@/styles/ops-monitor.css";
import { useEffect, useState } from "react";
import { AdminKeysManager } from "@/components/ops/AdminKeysManager";
import { AdminOpsMonitor } from "@/components/ops/AdminOpsMonitor";
import { AdminSentryPanel } from "@/components/ops/AdminSentryPanel";

type OpsTab = "monitor" | "keys" | "sentry";

const TABS: Array<{ id: OpsTab; label: string }> = [
  { id: "monitor", label: "المراقبة" },
  { id: "keys", label: "المفاتيح والاستخدام" },
  { id: "sentry", label: "الأخطاء (Sentry)" },
];

function parseTab(raw: string | null | undefined): OpsTab {
  if (raw === "keys" || raw === "sentry" || raw === "monitor") return raw;
  return "monitor";
}

/**
 * Page-level tabs for /admin/ops — keys + health + Sentry in one super-admin place.
 */
export function AdminOpsTabs({ initialTab = "monitor" }: { initialTab?: OpsTab }) {
  const [tab, setTab] = useState<OpsTab>(initialTab);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    setTab(parseTab(q));
  }, []);

  function select(next: OpsTab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="dash-stack">
      <div
        className="ops-keys__tabs ops-page-tabs"
        role="tablist"
        aria-label="أقسام مراقبة النظام"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "is-active" : undefined}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monitor" ? <AdminOpsMonitor /> : null}
      {tab === "keys" ? <AdminKeysManager /> : null}
      {tab === "sentry" ? <AdminSentryPanel /> : null}
    </div>
  );
}
