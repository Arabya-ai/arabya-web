"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  return (
    <div className="shell page-block">
      <h1>{t("title")}</h1>
      <p>{t("message")}</p>
      <p className="error-actions">
        <button type="button" className="nav-pill" onClick={reset}>
          {t("retry")}
        </button>{" "}
        <Link href="/" className="nav-pill">
          {t("index")}
        </Link>
      </p>
    </div>
  );
}
