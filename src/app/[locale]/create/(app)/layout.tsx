import DashboardLayout from "@/ayat-studio/components/DashboardLayout";

export default function CreateAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
