"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminUserRow } from "@/lib/cloud-sync";
import { roleLabelAr, type UserRole } from "@/lib/roles";

type ColKey = "uid" | "user" | "email" | "role" | "status" | "actions";

const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: "uid", label: "ID" },
  { key: "user", label: "المستخدم" },
  { key: "email", label: "البريد / Username" },
  { key: "role", label: "الدور" },
  { key: "status", label: "الحالة" },
  { key: "actions", label: "إجراءات" },
];

export function AdminUsersTable({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [cols, setCols] = useState<Record<ColKey, boolean>>({
    uid: true,
    user: true,
    email: true,
    role: true,
    status: true,
    actions: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const offset = page * pageSize;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role) params.set("role", role);
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));
    try {
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        users?: AdminUserRow[];
        total?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل التحميل");
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }, [q, role, pageSize, offset]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 220);
    return () => window.clearTimeout(t);
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const visibleCols = useMemo(
    () => ALL_COLS.filter((c) => cols[c.key]),
    [cols],
  );

  async function setUserRole(id: string, next: "user" | "editor" | "admin") {
    if (next === "admin" && !isSuperAdmin) {
      setError("ترقية المدير للسوبر أدمن فقط");
      return;
    }
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

  async function banUser(id: string, banned: boolean) {
    const msg = banned
      ? `حظر ${id}؟ لن يتمكن من استخدام الحساب بنفس البريد.`
      : `إلغاء حظر ${id}؟`;
    if (!window.confirm(msg)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban", banned }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "فشل");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(id: string) {
    if (!window.confirm(`حذف بيانات السحابة لـ ${id}؟`)) return;
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
          setPage(0);
          void load();
        }}
      >
        <input
          type="search"
          placeholder="بحث ديناميكي: اسم / بريد / ID"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
        />
        <select
          value={role}
          onChange={(e) => {
            setPage(0);
            setRole(e.target.value);
          }}
        >
          <option value="">كل الأدوار</option>
          <option value="user">مشترك</option>
          <option value="editor">محرر</option>
          <option value="admin">مدير</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => {
            setPage(0);
            setPageSize(Number(e.target.value));
          }}
          aria-label="عدد الصفوف"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} صف
            </option>
          ))}
        </select>
        <button type="submit" className="auth-btn auth-btn--google">
          تحديث
        </button>
      </form>

      <div className="dash-col-toggles">
        <span>الأعمدة:</span>
        {ALL_COLS.map((c) => (
          <label key={c.key}>
            <input
              type="checkbox"
              checked={cols[c.key]}
              onChange={(e) =>
                setCols((prev) => ({ ...prev, [c.key]: e.target.checked }))
              }
            />
            {c.label}
          </label>
        ))}
      </div>

      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {visibleCols.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                {cols.uid ? (
                  <td dir="ltr" className="dash-mono">
                    {u.uid || u.id}
                  </td>
                ) : null}
                {cols.user ? (
                  <td>
                    {isSuperAdmin ? (
                      <Link
                        href={`/admin/users/${encodeURIComponent(u.id)}`}
                        className="dash-user-cell dash-user-link"
                      >
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt="" width={36} height={36} />
                        ) : (
                          <span className="dash-user-fallback" aria-hidden>
                            {(u.name || u.email || "?").slice(0, 1)}
                          </span>
                        )}
                        <span>{u.name || "—"}</span>
                      </Link>
                    ) : (
                      <div className="dash-user-cell">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt="" width={36} height={36} />
                        ) : (
                          <span className="dash-user-fallback" aria-hidden>
                            {(u.name || u.email || "?").slice(0, 1)}
                          </span>
                        )}
                        <span>{u.name || "—"}</span>
                      </div>
                    )}
                  </td>
                ) : null}
                {cols.email ? (
                  <td dir="ltr">
                    {isSuperAdmin ? (
                      <Link href={`/admin/users/${encodeURIComponent(u.id)}`}>
                        {u.email}
                      </Link>
                    ) : (
                      u.email
                    )}
                  </td>
                ) : null}
                {cols.role ? (
                  <td>{roleLabelAr((u.role as UserRole) || "user")}</td>
                ) : null}
                {cols.status ? (
                  <td>{u.status === "banned" ? "محظور" : "نشط"}</td>
                ) : null}
                {cols.actions ? (
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
                      {u.role === "editor" && isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => void setUserRole(u.id, "admin")}
                        >
                          ترقية لمدير
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
                        <>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() =>
                              void banUser(u.id, u.status !== "banned")
                            }
                          >
                            {u.status === "banned" ? "إلغاء الحظر" : "حظر"}
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={busyId === u.id}
                            onClick={() => void removeUser(u.id)}
                          >
                            حذف
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="dash-muted" style={{ padding: "1rem" }}>
            لا نتائج.
          </p>
        ) : null}
      </div>

      <div className="dash-pagination">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          السابق
        </button>
        <span>
          صفحة {page + 1} / {pageCount} — الإجمالي {total}
        </span>
        <button
          type="button"
          disabled={page + 1 >= pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          التالي
        </button>
      </div>
    </div>
  );
}
