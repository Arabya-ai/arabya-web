"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { AdminStats } from "@/lib/cloud-sync";
import { DashIcon, type DashIconName } from "@/components/dashboard/DashIcon";

const cardMeta: { key: keyof AdminStats; labelKey: string; icon: DashIconName }[] = [
  { key: "totalUsers", labelKey: "statTotalUsers", icon: "users" },
  { key: "users", labelKey: "statUsers", icon: "spark" },
  { key: "editors", labelKey: "statEditors", icon: "studio" },
  { key: "admins", labelKey: "statAdmins", icon: "shield" },
  { key: "pendingRoleRequests", labelKey: "statPendingRequests", icon: "requests" },
  { key: "activeLast7Days", labelKey: "statActive7d", icon: "stats" },
  { key: "totalBookmarks", labelKey: "statBookmarks", icon: "favorites" },
  { key: "totalNotes", labelKey: "statNotes", icon: "book" },
];

export function AdminStatsCards() {
  const t = useTranslations("Admin");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        stats?: AdminStats;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.stats) {
        throw new Error(data.error || t("statsLoadError"));
      }
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="dash-banner dash-banner--warn">{error}</p>;
  }
  if (!stats) {
    return (
      <div className="dash-stat-grid dash-stat-grid--loading" aria-busy>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dash-stat dash-stat--skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="dash-stat-grid">
      {cardMeta.map((c, i) => (
        <article
          key={c.key}
          className="dash-stat"
          style={{ animationDelay: `${i * 45}ms` }}
        >
          <span className="dash-stat-icon">
            <DashIcon name={c.icon} />
          </span>
          <p className="dash-stat-value">{stats[c.key]}</p>
          <p className="dash-stat-label">{t(c.labelKey as "statTotalUsers")}</p>
        </article>
      ))}
    </div>
  );
}
