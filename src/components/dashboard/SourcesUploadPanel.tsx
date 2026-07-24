"use client";

import { useCallback, useEffect, useState } from "react";
import type { SourceUploadRow } from "@/lib/cloud-sync";

export function SourcesUploadPanel() {
  const [uploads, setUploads] = useState<SourceUploadRow[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/uploads", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        uploads?: SourceUploadRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل التحميل");
      setUploads(data.uploads || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const text = await file.text();
      JSON.parse(text);
      const res = await fetch("/api/studio/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          payload: text,
          notes,
          kind: "json",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل الرفع");
      setOkMsg(`تم رفع الملف (${data.id}). يمكن استيراده لاحقًا عبر سكربتات المشروع.`);
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash-stack">
      <section className="dash-card">
        <h2>رفع مصدر JSON</h2>
        <p className="dash-muted">
          ارفع ملف JSON جاهز للاستيراد (كتب إعراب أو مصادر تحليل). يُخزَّن في
          السحابة بحالة «قيد المراجعة» ثم يُمرَّر إلى{" "}
          <code>import-irab-book</code> / <code>import-from-incoming</code> عند
          الاعتماد.
        </p>
        <div className="dash-form">
          <label>
            ملاحظات للمحرر
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="مثال: نسخة مرخّصة من كتاب…"
            />
          </label>
          <label className="users-action users-action--primary" style={{ display: "inline-flex", cursor: "pointer" }}>
            {busy ? "جاري الرفع…" : "اختر ملف JSON"}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
        {okMsg ? <p className="dash-banner dash-banner--ok">{okMsg}</p> : null}
      </section>

      <section className="dash-card">
        <h2>الملفات المرفوعة</h2>
        {uploads.length === 0 ? (
          <p className="dash-muted">لا مرفوعات بعد.</p>
        ) : (
          <ul className="dash-list">
            {uploads.map((u) => (
              <li key={u.id}>
                <strong>{u.filename}</strong> — {u.status}
                {u.bytes != null ? ` · ${u.bytes} بايت` : ""} ·{" "}
                {new Date(u.createdAt).toLocaleString("ar")}
                {u.notes ? ` · ${u.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
