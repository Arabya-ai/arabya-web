"use client";

import { useState } from "react";
import { readBookmarks, writeBookmarks, type Bookmark } from "@/lib/bookmarks";
import { readAyahNotes, type AyahNote } from "@/lib/ayah-notes";
import {
  LAST_MUSHAF_PAGE_KEY,
  readReadingHabit,
  writeReadingHabit,
  type ReadingHabitState,
} from "@/lib/reading-habit";

function writeAllNotes(list: AyahNote[]) {
  localStorage.setItem("arabya-ayah-notes", JSON.stringify(list.slice(0, 300)));
}

function applyCloudToLocal(data: {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  progress: { lastPage: number | null; habit: unknown };
}) {
  if (Array.isArray(data.bookmarks)) writeBookmarks(data.bookmarks);
  if (Array.isArray(data.notes)) writeAllNotes(data.notes);

  const habit = data.progress?.habit;
  if (habit && typeof habit === "object") {
    writeReadingHabit(habit as ReadingHabitState);
  }
  if (data.progress?.lastPage != null) {
    localStorage.setItem(LAST_MUSHAF_PAGE_KEY, String(data.progress.lastPage));
  }
}

function collectLocalPayload() {
  const lastRaw = localStorage.getItem(LAST_MUSHAF_PAGE_KEY);
  const lastPage = lastRaw ? Number(lastRaw) : null;
  return {
    bookmarks: readBookmarks(),
    notes: readAyahNotes(),
    progress: {
      lastPage: Number.isFinite(lastPage) ? lastPage : null,
      habit: readReadingHabit(),
    },
  };
}

export function CloudSyncPanel() {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run(mode: "pull" | "push") {
    setBusy(true);
    setStatus(mode === "pull" ? "جاري السحب من السحابة…" : "جاري الرفع إلى السحابة…");
    try {
      if (mode === "pull") {
        const res = await fetch("/api/sync", { method: "GET", cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.message || data.error || "فشل السحب");
        }
        applyCloudToLocal(data);
        setStatus(
          `تم السحب: ${data.bookmarks?.length ?? 0} مفضّلة، ${data.notes?.length ?? 0} ملاحظة.`,
        );
        return;
      }

      const payload = collectLocalPayload();
      const res = await fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "فشل الرفع");
      }
      applyCloudToLocal(data);
      setStatus("تم حفظ نسختك على السحابة بنجاح.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "تعذّرت المزامنة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel account-panel--accent" aria-label="مزامنة سحابية">
      <h2>مزامنة الأجهزة (D1)</h2>
      <p>
        ارفع بيانات هذا الجهاز إلى حسابك، أو اسحب النسخة السحابية إلى هذا الجهاز.
        الزائر بلا حساب يبقى على التخزين المحلي فقط.
      </p>
      <div className="account-panel-actions">
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void run("push")}
        >
          رفع إلى السحابة
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--account"
          disabled={busy}
          onClick={() => void run("pull")}
        >
          سحب من السحابة
        </button>
      </div>
      {status ? <p className="account-sync-status">{status}</p> : null}
    </section>
  );
}
