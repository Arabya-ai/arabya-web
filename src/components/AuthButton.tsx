"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthButton() {
  const { data, status } = useSession();

  if (status === "loading") {
    return (
      <span className="auth-btn auth-btn--ghost" aria-busy="true">
        …
      </span>
    );
  }

  if (data?.user) {
    return (
      <div className="auth-chip-row">
        <Link href="/account" className="auth-btn auth-btn--account" title="حسابي">
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
        </Link>
        <button
          type="button"
          className="auth-btn auth-btn--ghost"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          خروج
        </button>
      </div>
    );
  }

  return (
    <Link href="/login" className="auth-btn auth-btn--google">
      دخول
    </Link>
  );
}
