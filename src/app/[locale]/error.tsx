"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import "@/components/services/services-hub.css";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  return (
    <div className="shell page-block services-hub">
      <header className="services-hub__hero">
        <h1>{t("title")}</h1>
        <p>{t("message")}</p>
        <div className="services-hub__hero-actions error-actions">
          <button
            type="button"
            className="not-found-cta not-found-cta--primary"
            onClick={reset}
          >
            {t("retry")}
          </button>
          <Link href="/" className="not-found-cta not-found-cta--ghost">
            {t("backHome")}
          </Link>
          <Link href="/services" className="nav-pill">
            {t("browseServices")}
          </Link>
        </div>
      </header>
    </div>
  );
}
