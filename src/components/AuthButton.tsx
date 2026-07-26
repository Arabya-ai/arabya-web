"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { useDismissibleOpen } from "@/hooks/useDismissibleOpen";
import { Link } from "@/i18n/navigation";

export function AuthButton() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const { data, status } = useSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const { open, setOpen, toggle, openOnHover, closeOnLeave } =
    useDismissibleOpen(rootRef, { closeOnPointerLeave: true });

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
        onPointerEnter={openOnHover}
        onPointerLeave={closeOnLeave}
      >
        <button
          type="button"
          className="auth-btn auth-btn--account nav-dropdown-trigger"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={toggle}
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
        <div className="nav-dropdown-menu" role="menu" hidden={!open}>
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
          <Link href="/studio" role="menuitem" onClick={() => setOpen(false)}>
            {t("studio")}
          </Link>
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
