"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminStats } from "@/lib/cloud-sync";
import { DashIcon, type DashIconName } from "@/components/dashboard/DashIcon";

const cardMeta: { key: keyof AdminStats; label: string; icon: DashIconName }[] = [
  { key: "totalUsers", label: "إجمالي المستخدمين", icon: "users" },
  { key: "users", label: "مشتركون", icon: "spark" },
  { key: "editors", label: "محررون", icon: "studio" },
  { key: "admins", label: "مدراء", icon: "shield" },
  { key: "pendingRoleRequests", label: "طلبات معلّقة", icon: "requests" },
  { key: "activeLast7Days", label: "نشطون 7 أيام", icon: "stats" },
  { key: "totalBookmarks", label: "مفضّلات سحابية", icon: "favorites" },
  { key: "totalNotes", label: "ملاحظات سحابية", icon: "book" },
];

export function AdminStatsCards() {
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
        throw new Error(data.error || "تعذّر تحميل الإحصائيات");
      }
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, []);

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
          <p className="dash-stat-label">{c.label}</p>
        </article>
      ))}
    </div>
  );
}
