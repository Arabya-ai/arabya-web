"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminStats } from "@/lib/cloud-sync";

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
    return <p className="dash-muted">جاري تحميل الإحصائيات…</p>;
  }

  const cards: { label: string; value: number }[] = [
    { label: "إجمالي المستخدمين", value: stats.totalUsers },
    { label: "مشتركون", value: stats.users },
    { label: "محررون", value: stats.editors },
    { label: "مدراء", value: stats.admins },
    { label: "طلبات ترقية معلّقة", value: stats.pendingRoleRequests },
    { label: "نشطون آخر 7 أيام", value: stats.activeLast7Days },
    { label: "مفضّلات سحابية", value: stats.totalBookmarks },
    { label: "ملاحظات سحابية", value: stats.totalNotes },
  ];

  return (
    <div className="dash-stat-grid">
      {cards.map((c) => (
        <article key={c.label} className="dash-stat">
          <p className="dash-stat-value">{c.value}</p>
          <p className="dash-stat-label">{c.label}</p>
        </article>
      ))}
    </div>
  );
}
