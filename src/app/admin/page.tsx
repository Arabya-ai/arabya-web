import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/roles";

export const metadata: Metadata = {
  title: "لوحة المدير",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) redirect("/account");

  return (
    <div className="shell page-block account-page">
      <p className="auth-kicker">إدارة عربية</p>
      <h1>لوحة المدير</h1>
      <p className="auth-lead">
        إدارة المستخدمين والأدوار والأعلام ستُبنى هنا. الوصول محصور بحسابات
        المدراء المعرّفة في الإعدادات.
      </p>
      <Link href="/account" className="account-panel-link">
        العودة لحسابي
      </Link>
    </div>
  );
}
