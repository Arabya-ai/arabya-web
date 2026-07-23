"use client";

import { useEffect, useState } from "react";
import {
  collectLocalSyncPayload,
  pullMergeAndPush,
  pushLocalOnly,
} from "@/lib/cloud-sync-client";

export function CloudSyncPanel() {
  const [status, setStatus] = useState("المزامنة تعمل تلقائيًا بعد تسجيل الدخول.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const local = collectLocalSyncPayload();
    setStatus(
      `تلقائي: تُحفظ المفضّلات والملاحظات وعادة القراءة على حسابك دون أزرار. (محليًا الآن: ${local.bookmarks.length} مفضّلة، ${local.notes.length} ملاحظة)`,
    );
  }, []);

  async function run(mode: "full" | "push") {
    setBusy(true);
    setStatus(mode === "full" ? "مزامنة كاملة…" : "رفع فوري…");
    try {
      const result =
        mode === "full" ? await pullMergeAndPush() : await pushLocalOnly();
      setStatus(result.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "تعذّرت المزامنة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel account-panel--accent" aria-label="مزامنة سحابية">
      <h2>مزامنة الأجهزة (تلقائية)</h2>
      <p>
        بعد دخولك، تُزامن بياناتك مع السحابة تلقائيًا عند فتح الموقع وعند كل تغيير
        (مفضّلة، ملاحظة، عادة قراءة). الأزرار أدناه اختيارية للطوارئ فقط.
      </p>
      <div className="account-panel-actions">
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void run("push")}
        >
          مزامنة فورية
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--account"
          disabled={busy}
          onClick={() => void run("full")}
        >
          مزامنة كاملة الآن
        </button>
      </div>
      {status ? <p className="account-sync-status">{status}</p> : null}
    </section>
  );
}
