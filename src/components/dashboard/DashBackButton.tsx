"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashIcon } from "@/components/dashboard/DashIcon";

export function DashBackButton({
  href,
  label,
}: {
  href: string;
  label?: string;
}) {
  const t = useTranslations("Account");

  return (
    <Link href={href} className="dash-back-btn">
      <DashIcon name="back" />
      <span>{label ?? t("back")}</span>
    </Link>
  );
}
