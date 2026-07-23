"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoleRequestRow } from "@/lib/cloud-sync";

export function AdminRequestsPanel() {
  const [requests, setRequests] = useState<RoleRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/requests?status=pending", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        requests?: RoleRequestRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل التحميل");
      setRequests(data.requests || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, decision }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="dash-banner dash-banner--warn">{error}</p>;

  return (
    <div className="dash-stack">
      {requests.length === 0 ? (
        <p className="dash-muted">لا طلبات معلّقة حاليًا.</p>
      ) : (
        requests.map((r) => (
          <article key={r.id} className="dash-card">
            <div className="dash-user-cell">
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" width={36} height={36} />
              ) : null}
              <div>
                <strong>{r.name || r.email}</strong>
                <p className="dash-muted" dir="ltr">
                  {r.email}
                </p>
              </div>
            </div>
            <p>{r.message || "بدون رسالة"}</p>
            <div className="dash-row-actions">
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => void review(r.id, "approved")}
              >
                موافقة
              </button>
              <button
                type="button"
                className="danger"
                disabled={busyId === r.id}
                onClick={() => void review(r.id, "rejected")}
              >
                رفض
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
