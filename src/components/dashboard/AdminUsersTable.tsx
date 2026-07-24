"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminUserRow } from "@/lib/cloud-sync";
import { roleLabelAr, type UserRole } from "@/lib/roles";

export function AdminUsersTable({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [showUid, setShowUid] = useState(true);
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

  function UserIdentity({ u }: { u: AdminUserRow }) {
    const displayName = u.name?.trim() || u.email.split("@")[0] || "مستخدم";
    const uid = u.uid || u.id;
    const inner = (
      <>
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.image} alt="" width={44} height={44} />
        ) : (
          <span className="dash-user-fallback" aria-hidden>
            {displayName.slice(0, 1)}
          </span>
        )}
        <span className="users-id-meta">
          <span className="users-id-name">{displayName}</span>
          <span className="users-id-email" dir="ltr" title={u.email}>
            {u.email}
          </span>
          {showUid ? (
            <span className="users-id-uid" dir="ltr" title={uid}>
              ID: {uid}
            </span>
          ) : null}
        </span>
      </>
    );

    if (isSuperAdmin) {
      return (
        <Link
          href={`/admin/users/${encodeURIComponent(u.id)}`}
          className="users-id-cell users-id-cell--link"
        >
          {inner}
        </Link>
      );
    }
    return <div className="users-id-cell">{inner}</div>;
  }

  function RoleBadge({ role }: { role: UserRole }) {
    return (
      <span className={`users-badge users-badge--${role}`}>
        {roleLabelAr(role)}
      </span>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const banned = status === "banned";
    return (
      <span
        className={`users-badge ${banned ? "users-badge--banned" : "users-badge--active"}`}
      >
        {banned ? "محظور" : "نشط"}
      </span>
    );
  }

  function Actions({ u }: { u: AdminUserRow }) {
    const busy = busyId === u.id;
    if (u.role === "admin") {
      return <span className="users-actions-locked">محمي</span>;
    }
    return (
      <div className="users-actions">
        {u.role !== "editor" ? (
          <button
            type="button"
            className="users-action users-action--primary"
            disabled={busy}
            onClick={() => void setUserRole(u.id, "editor")}
          >
            ترقية
          </button>
        ) : null}
        {u.role === "editor" && isSuperAdmin ? (
          <button
            type="button"
            className="users-action users-action--primary"
            disabled={busy}
            onClick={() => void setUserRole(u.id, "admin")}
          >
            مدير
          </button>
        ) : null}
        {u.role === "editor" ? (
          <button
            type="button"
            className="users-action"
            disabled={busy}
            onClick={() => void setUserRole(u.id, "user")}
          >
            سحب
          </button>
        ) : null}
        <button
          type="button"
          className="users-action"
          disabled={busy}
          onClick={() => void banUser(u.id, u.status !== "banned")}
        >
          {u.status === "banned" ? "رفع الحظر" : "حظر"}
        </button>
        <button
          type="button"
          className="users-action users-action--danger"
          disabled={busy}
          onClick={() => void removeUser(u.id)}
        >
          حذف
        </button>
      </div>
    );
  }

  return (
    <div className="dash-stack users-panel">
      <form
        className="users-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          void load();
        }}
      >
        <input
          type="search"
          className="users-toolbar-search"
          placeholder="بحث بالاسم أو البريد أو ID…"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
          aria-label="بحث المستخدمين"
        />
        <select
          value={role}
          onChange={(e) => {
            setPage(0);
            setRole(e.target.value);
          }}
          aria-label="فلتر الدور"
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
        <label className="users-uid-toggle">
          <input
            type="checkbox"
            checked={showUid}
            onChange={(e) => setShowUid(e.target.checked)}
          />
          إظهار ID
        </label>
        <button type="submit" className="auth-btn auth-btn--google users-toolbar-btn">
          تحديث
        </button>
      </form>

      {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}

      {/* Desktop / tablet table */}
      <div className="users-table-shell">
        <table className="users-table">
          <thead>
            <tr>
              <th scope="col">المستخدم</th>
              <th scope="col">الدور</th>
              <th scope="col">الحالة</th>
              <th scope="col">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.status === "banned" ? "is-banned" : undefined}>
                <td>
                  <UserIdentity u={u} />
                </td>
                <td>
                  <RoleBadge role={(u.role as UserRole) || "user"} />
                </td>
                <td>
                  <StatusBadge status={u.status} />
                </td>
                <td>
                  <Actions u={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="users-empty">لا نتائج مطابقة للبحث.</p>
        ) : null}
      </div>

      {/* Mobile cards */}
      <div className="users-cards">
        {users.length === 0 ? (
          <p className="users-empty">لا نتائج مطابقة للبحث.</p>
        ) : (
          users.map((u) => (
            <article
              key={u.id}
              className={`users-card${u.status === "banned" ? " is-banned" : ""}`}
            >
              <UserIdentity u={u} />
              <div className="users-card-meta">
                <RoleBadge role={(u.role as UserRole) || "user"} />
                <StatusBadge status={u.status} />
              </div>
              <Actions u={u} />
            </article>
          ))
        )}
      </div>

      <div className="dash-pagination users-pagination">
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
