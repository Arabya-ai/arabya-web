import type { ReactNode } from "react";
import { requireSession } from "@/lib/require-session";

export default async function CreateSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();
  return children;
}
