"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sessionCount: number;
  syncReady: boolean;
};

export function TahfeezHistoryActions({ sessionCount, syncReady }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const ar = locale === "ar";

  async function clearSessions() {
    if (!syncReady) return;
    const ok = window.confirm(
      ar
        ? "حذف كل جلسات التحفيظ المحفوظة؟ لا يمكن التراجع."
        : "Delete all saved tahfeez sessions? This cannot be undone.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/history?scope=tahfeez", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("clear_failed");
      router.refresh();
    } catch {
      window.alert(ar ? "تعذّر الحذف." : "Could not clear sessions.");
    } finally {
      setBusy(false);
    }
  }

  if (!syncReady || sessionCount === 0) return null;

  return (
    <div className="dash-row-actions" style={{ marginTop: "0.75rem" }}>
      <button type="button" className="danger" disabled={busy} onClick={() => void clearSessions()}>
        {busy
          ? ar
            ? "جاري الحذف…"
            : "Clearing…"
          : ar
            ? "تصفير سجل الجلسات"
            : "Clear session history"}
      </button>
    </div>
  );
}
