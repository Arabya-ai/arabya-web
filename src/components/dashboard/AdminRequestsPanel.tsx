"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";
import type { RoleRequestRow } from "@/lib/cloud-sync";

export function AdminRequestsPanel() {
  const t = useTranslations("Admin");
  const tRoles = useTranslations("Roles");
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
      if (!res.ok || !data.ok) throw new Error(data.error || t("loadError"));
      setRequests(data.requests || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }, [t]);

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
      if (!res.ok || !data.ok) throw new Error(data.error || t("actionError"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="dash-banner dash-banner--warn">{error}</p>;

  return (
    <ArabyaPanelStack className="dash-stack">
      {requests.length === 0 ? (
        <p className="dash-muted">{t("noPendingRequests")}</p>
      ) : (
        requests.map((r) => (
          <ArabyaPanel key={r.id} as="article" legacyDash>
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
            <p>{r.message || t("noMessage")}</p>
            {r.targetRole ? (
              <p className="dash-muted">
                {t("requestedRole")}:{" "}
                {tRoles(r.targetRole as "admin" | "editor" | "user")}
              </p>
            ) : null}
            <div className="dash-row-actions">
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => void review(r.id, "approved")}
              >
                {t("approve")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={busyId === r.id}
                onClick={() => void review(r.id, "rejected")}
              >
                {t("reject")}
              </button>
            </div>
          </ArabyaPanel>
        ))
      )}
    </ArabyaPanelStack>
  );
}
