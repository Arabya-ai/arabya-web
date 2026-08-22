import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/require-session";

export default async function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();
  return children;
}
