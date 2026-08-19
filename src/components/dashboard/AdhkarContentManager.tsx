"use client";

import { useEffect, useMemo, useState } from "react";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";

type Category = {
  slug: string;
  titleAr: string;
  titleEn: string;
};

type AdhkarItem = {
  id: string;
  textAr: string;
  repeat: number;
  source?: string;
  fadlAr?: string;
  active?: boolean;
};

type DuaItem = {
  id: string;
  categoryAr: string;
  categoryEn: string;
  textAr: string;
  source?: string;
  active?: boolean;
};

export function AdhkarContentManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [adhkarBySlug, setAdhkarBySlug] = useState<Record<string, AdhkarItem[]>>({});
  const [duas, setDuas] = useState<DuaItem[]>([]);
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [adhkarForm, setAdhkarForm] = useState({
    id: "",
    textAr: "",
    repeat: "1",
    source: "",
    fadlAr: "",
  });
  const [duaForm, setDuaForm] = useState({
    id: "",
    textAr: "",
    categoryAr: "",
    categoryEn: "",
    source: "",
  });

  async function load() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editor/adhkar-content", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        categories?: Category[];
        adhkarBySlug?: Record<string, AdhkarItem[]>;
        duas?: DuaItem[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || "load_failed");
      const nextCats = json.categories ?? [];
      setCategories(nextCats);
      setAdhkarBySlug(json.adhkarBySlug ?? {});
      setDuas(json.duas ?? []);
      setSlug((cur) => cur || nextCats[0]?.slug || "");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "load_failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const currentItems = useMemo(() => adhkarBySlug[slug] ?? [], [adhkarBySlug, slug]);

  async function saveAdhkar() {
    if (!slug) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editor/adhkar-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "adhkar",
          action: "upsert",
          payload: {
            slug,
            item: {
              id: adhkarForm.id,
              textAr: adhkarForm.textAr,
              repeat: Number(adhkarForm.repeat || "1"),
              source: adhkarForm.source,
              fadlAr: adhkarForm.fadlAr,
            },
          },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "save_failed");
      setAdhkarForm({ id: "", textAr: "", repeat: "1", source: "", fadlAr: "" });
      setMsg("تم حفظ الذكر.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  async function archiveAdhkar(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editor/adhkar-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "adhkar",
          action: "archive",
          payload: { slug, item: { id } },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "archive_failed");
      setMsg("تم إخفاء الذكر.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "archive_failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveDua() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editor/adhkar-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dua",
          action: "upsert",
          payload: { item: duaForm },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "save_failed");
      setDuaForm({ id: "", textAr: "", categoryAr: "", categoryEn: "", source: "" });
      setMsg("تم حفظ الدعاء.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  async function archiveDua(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editor/adhkar-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dua",
          action: "archive",
          payload: { item: { id } },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "archive_failed");
      setMsg("تم إخفاء الدعاء.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "archive_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ArabyaPanelStack className="dash-stack">
      {msg ? <p className="dash-banner">{msg}</p> : null}

      <ArabyaPanel legacyDash title="إدارة الأذكار (admin + editor)">
        <label className="appearance-field">
          <span>الفئة</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.titleAr}
              </option>
            ))}
          </select>
        </label>
        <div className="dash-list">
          {currentItems.slice(0, 15).map((item) => (
            <div key={item.id} className="dash-actions">
              <span>{item.id}</span>
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                disabled={busy}
                onClick={() => {
                  setAdhkarForm({
                    id: item.id,
                    textAr: item.textAr,
                    repeat: String(item.repeat),
                    source: item.source || "",
                    fadlAr: item.fadlAr || "",
                  });
                }}
              >
                تعديل
              </button>
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                disabled={busy}
                onClick={() => void archiveAdhkar(item.id)}
              >
                إخفاء
              </button>
            </div>
          ))}
        </div>
        <div className="dash-stack mt-3">
          <label className="appearance-field">
            <span>معرّف الذكر</span>
            <input
              value={adhkarForm.id}
              onChange={(e) => setAdhkarForm((p) => ({ ...p, id: e.target.value }))}
            />
          </label>
          <label className="appearance-field">
            <span>النص</span>
            <textarea
              rows={3}
              value={adhkarForm.textAr}
              onChange={(e) =>
                setAdhkarForm((p) => ({ ...p, textAr: e.target.value }))
              }
            />
          </label>
          <label className="appearance-field">
            <span>التكرار</span>
            <input
              type="number"
              min={1}
              value={adhkarForm.repeat}
              onChange={(e) =>
                setAdhkarForm((p) => ({ ...p, repeat: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className="auth-btn auth-btn--google"
            disabled={busy}
            onClick={() => void saveAdhkar()}
          >
            حفظ الذكر
          </button>
        </div>
      </ArabyaPanel>

      <ArabyaPanel legacyDash title="إدارة الأدعية (admin + editor)">
        <div className="dash-list">
          {duas.slice(0, 15).map((item) => (
            <div key={item.id} className="dash-actions">
              <span>{item.id}</span>
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                disabled={busy}
                onClick={() =>
                  setDuaForm({
                    id: item.id,
                    textAr: item.textAr,
                    categoryAr: item.categoryAr,
                    categoryEn: item.categoryEn,
                    source: item.source || "",
                  })
                }
              >
                تعديل
              </button>
              <button
                type="button"
                className="auth-btn auth-btn--ghost"
                disabled={busy}
                onClick={() => void archiveDua(item.id)}
              >
                إخفاء
              </button>
            </div>
          ))}
        </div>

        <div className="dash-stack mt-3">
          <label className="appearance-field">
            <span>معرّف الدعاء</span>
            <input
              value={duaForm.id}
              onChange={(e) => setDuaForm((p) => ({ ...p, id: e.target.value }))}
            />
          </label>
          <label className="appearance-field">
            <span>التصنيف العربي</span>
            <input
              value={duaForm.categoryAr}
              onChange={(e) =>
                setDuaForm((p) => ({ ...p, categoryAr: e.target.value }))
              }
            />
          </label>
          <label className="appearance-field">
            <span>النص</span>
            <textarea
              rows={3}
              value={duaForm.textAr}
              onChange={(e) => setDuaForm((p) => ({ ...p, textAr: e.target.value }))}
            />
          </label>
          <button
            type="button"
            className="auth-btn auth-btn--google"
            disabled={busy}
            onClick={() => void saveDua()}
          >
            حفظ الدعاء
          </button>
        </div>
      </ArabyaPanel>
    </ArabyaPanelStack>
  );
}
