"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const TABS = ["services", "appearance", "content"] as const;

export function AdminSettingsTabs({
  active,
}: {
  active: (typeof TABS)[number];
}) {
  const t = useTranslations("Admin");

  return (
    <nav className="admin-settings-tabs" aria-label={t("settingsTabsAria")}>
      {TABS.map((id) => (
        <Link
          key={id}
          href={`/admin/settings?tab=${id}`}
          className={`admin-settings-tab${active === id ? " is-active" : ""}`}
          aria-current={active === id ? "page" : undefined}
        >
          {id === "services"
            ? t("tabServices")
            : id === "appearance"
              ? t("tabAppearance")
              : t("tabContent")}
        </Link>
      ))}
    </nav>
  );
}
