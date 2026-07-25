import DashboardLayout from "@/ayat-studio/components/DashboardLayout";

export default function AyatStudioShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
