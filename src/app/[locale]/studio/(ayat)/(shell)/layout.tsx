import DashboardLayout from "@/ayat-studio/components/DashboardLayout";
import { requireSession } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export default async function AyatStudioShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <DashboardLayout>{children}</DashboardLayout>;
}
