"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";

function AccountGlyph({ signedIn }: { signedIn: boolean }) {
  return (
    <svg
      aria-hidden
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      {!signedIn ? (
        <path d="M19 5v4M21 7h-4" strokeWidth="2" />
      ) : null}
    </svg>
  );
}

/** Compact account entry for mobile header (outside hamburger nav). */
export function AccountHeaderIcon() {
  const t = useTranslations("Auth");
  const { data, status } = useSession();

  if (status === "loading") {
    return (
      <span
        className="header-account-icon header-account-icon--ghost"
        aria-busy="true"
        aria-label={t("loading")}
      >
        <AccountGlyph signedIn={false} />
      </span>
    );
  }

  const href = data?.user ? "/account" : "/login";
  const label = data?.user ? t("accountIcon") : t("signInIcon");

  return (
    <Link
      href={href}
      className="header-account-icon"
      aria-label={label}
      title={label}
    >
      {data?.user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.user.image}
          alt=""
          className="header-account-icon__avatar"
          width={28}
          height={28}
        />
      ) : (
        <AccountGlyph signedIn={Boolean(data?.user)} />
      )}
    </Link>
  );
}
