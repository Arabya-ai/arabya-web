import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessStudio } from "@/lib/roles";

export const metadata: Metadata = {
  title: "لوحة المحرر",
};

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessStudio(session.user.role)) redirect("/account");

  return (
    <div className="shell page-block account-page">
      <p className="auth-kicker">محرر عربية</p>
      <h1>لوحة المحرر</h1>
      <p className="auth-lead">
        هنا ستظهر لاحقًا طوابير جودة المحتوى، الفهارس، وكتب الإعراب. الهيكل جاهز؛
        الأدوات تُضاف في مرحلة لاحقة من الخطة.
      </p>
      <Link href="/account" className="account-panel-link">
        العودة لحسابي
      </Link>
    </div>
  );
}
