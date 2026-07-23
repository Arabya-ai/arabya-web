"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

export function AuthButton() {
  const { data, status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") {
    return (
      <span className="auth-btn auth-btn--ghost" aria-busy="true">
        …
      </span>
    );
  }

  if (data?.user) {
    return (
      <div
        className={`nav-dropdown ${open ? "is-open" : ""}`}
        ref={rootRef}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            setOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            setOpen(false);
          }
        }}
      >
        <button
          type="button"
          className="auth-btn auth-btn--account nav-dropdown-trigger"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          {data.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.user.image}
              alt=""
              className="auth-avatar"
              width={28}
              height={28}
            />
          ) : null}
          <span>حسابي</span>
        </button>
        <div className="nav-dropdown-menu" role="menu">
          <Link href="/account" role="menuitem" onClick={() => setOpen(false)}>
            لوحة الحساب
          </Link>
          <Link href="/favorites" role="menuitem" onClick={() => setOpen(false)}>
            المفضّلات والملاحظات
          </Link>
          <button
            type="button"
            role="menuitem"
            className="nav-dropdown-action"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/" });
            }}
          >
            خروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link href="/login" className="auth-btn auth-btn--google">
      دخول
    </Link>
  );
}
