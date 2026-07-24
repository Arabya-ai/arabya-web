"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteStudyEntry,
  readStudyEntries,
  updateStudyNotes,
  type StudyEntry,
} from "@/lib/study-archive";
import { toArabicNumerals } from "@/lib/format";

export function StudyArchivePanel() {
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function reload() {
    setEntries(readStudyEntries());
  }

  useEffect(() => {
    reload();
    window.addEventListener("arabya-study-updated", reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("arabya-study-updated", reload);
      window.removeEventListener("focus", reload);
    };
  }, []);

  return (
    <div className="dash-stack">
      <section className="dash-card">
        <h2>
          أرشيف الدراسة{" "}
          <span className="library-count">({toArabicNumerals(entries.length)})</span>
        </h2>
        <p className="dash-muted">
          تُحفظ تلقائيًا عند استخدام «دراسة سريعة» أو دراسة كلمة. يمكنك إضافة
          ملاحظات أو الحذف.
        </p>
      </section>

      {entries.length === 0 ? (
        <section className="dash-card">
          <p className="dash-muted">
            لا دراسات محفوظة بعد. ابدأ من{" "}
            <Link href="/study">دراسة سريعة</Link>.
          </p>
        </section>
      ) : (
        entries.map((e) => (
          <article key={e.id} className="dash-card study-archive-card">
            <div className="study-archive-head">
              <div>
                <p className="dash-kicker">
                  {e.kind === "quick" ? "دراسة سريعة" : e.kind === "word" ? "كلمة" : "آية"}
                </p>
                <h2>{e.title}</h2>
                {e.snippet ? <p className="dash-muted">{e.snippet}</p> : null}
              </div>
              <div className="dash-row-actions">
                {e.href ? (
                  <Link href={e.href} className="account-panel-link">
                    فتح
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    deleteStudyEntry(e.id);
                    reload();
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
            {editing === e.id ? (
              <div className="dash-form">
                <label>
                  ملاحظات
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                  />
                </label>
                <div className="dash-row-actions">
                  <button
                    type="button"
                    onClick={() => {
                      updateStudyNotes(e.id, draft);
                      setEditing(null);
                      reload();
                    }}
                  >
                    حفظ
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {e.notes ? <p>{e.notes}</p> : <p className="dash-muted">لا ملاحظات بعد.</p>}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(e.id);
                    setDraft(e.notes || "");
                  }}
                >
                  تعديل الملاحظات
                </button>
              </div>
            )}
            <p className="dash-muted" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              آخر تحديث: {new Date(e.updatedAt).toLocaleString("ar")}
            </p>
          </article>
        ))
      )}
    </div>
  );
}
