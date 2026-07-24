import Link from "next/link";
import { DashIcon } from "@/components/dashboard/DashIcon";

export function DashBackButton({
  href,
  label = "رجوع",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link href={href} className="dash-back-btn">
      <DashIcon name="back" />
      <span>{label}</span>
    </Link>
  );
}
