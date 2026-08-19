"use client";

import { useEffect, useState } from "react";

type PrayerDefaults = {
  method: number;
  school: 0 | 1;
  updatedAt?: number | null;
  updatedBy?: string | null;
};

export function AdminPrayerDefaultsPanel() {
  const [settings, setSettings] = useState<PrayerDefaults | null>(null);
  const [method, setMethod] = useState("5");
  const [school, setSchool] = useState<"0" | "1">("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/prayer-settings", { cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          settings?: PrayerDefaults;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.settings) throw new Error(json.error || "load_failed");
        if (dead) return;
        setSettings(json.settings);
        setMethod(String(json.settings.method));
        setSchool(json.settings.school === 1 ? "1" : "0");
      } catch (err) {
        if (!dead) setMsg(err instanceof Error ? err.message : "load_failed");
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const methodNum = Number(method);
      const schoolNum = Number(school);
      const res = await fetch("/api/admin/prayer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: methodNum, school: schoolNum }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        settings?: PrayerDefaults;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.settings) throw new Error(json.error || "save_failed");
      setSettings(json.settings);
      setMsg("تم حفظ الإعدادات.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="dash-stack" onSubmit={(e) => void save(e)}>
      <p className="dash-muted">
        هذه الإعدادات هي الافتراضية العامة لمواقيت الصلاة (admin defaults).
      </p>
      <label className="appearance-field">
        <span>طريقة الحساب (method)</span>
        <input
          type="number"
          min={0}
          max={25}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />
      </label>
      <label className="appearance-field">
        <span>مدرسة العصر (school)</span>
        <select value={school} onChange={(e) => setSchool(e.target.value as "0" | "1")}>
          <option value="0">0 — شافعي/مالكي/حنبلي</option>
          <option value="1">1 — حنفي</option>
        </select>
      </label>
      {settings?.updatedAt ? (
        <p className="dash-muted">
          آخر تحديث: {new Date(settings.updatedAt).toLocaleString("ar")} بواسطة{" "}
          {settings.updatedBy || "-"}
        </p>
      ) : null}
      {msg ? <p className="dash-banner">{msg}</p> : null}
      <div className="dash-actions">
        <button type="submit" className="auth-btn auth-btn--google" disabled={busy}>
          {busy ? "جاري الحفظ…" : "حفظ إعدادات المواقيت"}
        </button>
      </div>
    </form>
  );
}
