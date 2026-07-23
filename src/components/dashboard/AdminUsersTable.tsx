"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow } from "@/lib/cloud-sync";
import { roleLabelAr, type UserRole } from "@/lib/roles";

export function AdminUsersTable() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    try {
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        users?: AdminUserRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل التحميل");
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, [q, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setUserRole(id: string, next: "user" | "editor") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل التحديث");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(id: string) {
    if (!window.confirm(`حذف بيانات السحابة للمستخدم ${id}؟ لا يمكن التراجع.`)) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "admin_ui_delete" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل الحذف");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dash-stack">
      <form
        className="dash-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          type="search"
          placeholder="بحث بالاسم أو البريد"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">كل الأدوار</option>
          <option value="user">مشترك</option>
          <option value="editor">محرر</option>
          <option value="admin">مدير</option>
        </select>
        <button type="submit" className="auth-btn auth-btn--google">
          بحث
        </button>
      </form>

      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="dash-user-cell">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" width={32} height={32} />
                    ) : (
                      <span className="dash-user-fallback" aria-hidden>
                        {(u.name || u.email || "?").slice(0, 1)}
                      </span>
                    )}
                    <span>{u.name || "—"}</span>
                  </div>
                </td>
                <td dir="ltr">{u.email}</td>
                <td>{roleLabelAr((u.role as UserRole) || "user")}</td>
                <td>
                  <div className="dash-row-actions">
                    {u.role !== "editor" && u.role !== "admin" ? (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void setUserRole(u.id, "editor")}
                      >
                        ترقية لمحرر
                      </button>
                    ) : null}
                    {u.role === "editor" ? (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void setUserRole(u.id, "user")}
                      >
                        سحب المحرر
                      </button>
                    ) : null}
                    {u.role !== "admin" ? (
                      <button
                        type="button"
                        className="danger"
                        disabled={busyId === u.id}
                        onClick={() => void removeUser(u.id)}
                      >
                        حذف بيانات
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="dash-muted">لا مستخدمين بعد — يظهرون بعد أول دخول بـ Google.</p>
        ) : null}
      </div>
    </div>
  );
}
