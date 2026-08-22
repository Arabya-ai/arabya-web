import type { ReactNode } from "react";
import { requireSession } from "@/lib/require-session";

export default async function AccountSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();
  return children;
}
