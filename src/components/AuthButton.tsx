"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";

export function AuthButton() {
  const t = useTranslations("Auth");
  const locale = useLocale();
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
        {t("loading")}
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
          <span>{t("account")}</span>
        </button>
        <div className="nav-dropdown-menu" role="menu">
          <Link href="/account" role="menuitem" onClick={() => setOpen(false)}>
            {t("dashboard")}
          </Link>
          <Link
            href="/favorites"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t("favorites")}
          </Link>
          {data.user.role === "editor" || data.user.role === "admin" ? (
            <Link href="/studio" role="menuitem" onClick={() => setOpen(false)}>
              {t("studio")}
            </Link>
          ) : null}
          {data.user.role === "admin" ? (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}>
              {t("admin")}
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="nav-dropdown-action"
            onClick={() => {
              setOpen(false);
              void signOut({
                callbackUrl: locale === "en" ? "/en" : "/",
              });
            }}
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link href="/login" className="auth-btn auth-btn--google">
      {t("signIn")}
    </Link>
  );
}
