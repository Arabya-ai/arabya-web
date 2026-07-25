"use client";

import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("Admin");
  const locale = useLocale();
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
        if (!res.ok || !data.ok) throw new Error(data.error || t("loadError"));
        setEntries(data.entries || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("genericError"));
      }
    })();
  }, [t]);

  if (error) return <p className="dash-banner dash-banner--warn">{error}</p>;
  if (!entries.length) return <p className="dash-muted">{t("auditEmpty")}</p>;

  return (
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr>
            <th>{t("auditTime")}</th>
            <th>{t("auditUser")}</th>
            <th>{t("auditChange")}</th>
            <th>{t("auditActor")}</th>
            <th>{t("auditReason")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{new Date(e.createdAt).toLocaleString(locale)}</td>
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
