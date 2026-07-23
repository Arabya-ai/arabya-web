"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  userId: string;
  actorId: string | null;
  fromRole: string | null;
  toRole: string;
  reason: string | null;
  createdAt: number;
};

export function AdminAuditList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/audit", { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          entries?: Entry[];
          error?: string;
        };
        if (!res.ok || !data.ok) throw new Error(data.error || "فشل");
        setEntries(data.entries || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطأ");
      }
    })();
  }, []);

  if (error) return <p className="dash-banner dash-banner--warn">{error}</p>;
  if (!entries.length) return <p className="dash-muted">لا سجلات بعد.</p>;

  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            <th>الوقت</th>
            <th>المستخدم</th>
            <th>من → إلى</th>
            <th>الفاعل</th>
            <th>السبب</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{new Date(e.createdAt).toLocaleString("ar")}</td>
              <td dir="ltr">{e.userId}</td>
              <td>
                {e.fromRole || "—"} → {e.toRole}
              </td>
              <td dir="ltr">{e.actorId || "—"}</td>
              <td>{e.reason || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
