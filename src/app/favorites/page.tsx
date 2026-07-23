import type { Metadata } from "next";
import Link from "next/link";
import { FavoritesLibrary } from "@/components/FavoritesLibrary";

export const metadata: Metadata = {
  title: "المفضّلات والملاحظات",
  description: "مفضّلاتك وملاحظات الآيات في عربية",
};

export default function FavoritesPage() {
  return (
    <div className="shell page-block account-page">
      <p className="auth-kicker">مكتبتك الشخصية</p>
      <h1>المفضّلات والملاحظات</h1>
      <p className="auth-lead">
        تُحفظ على جهازك، وتُزامن تلقائيًا مع حسابك بعد تسجيل الدخول.
      </p>
      <p className="auth-foot" style={{ marginBottom: "1.25rem" }}>
        <Link href="/account">العودة لحسابي</Link>
        {" · "}
        <Link href="/">الرئيسية</Link>
      </p>
      <FavoritesLibrary mode="full" />
    </div>
  );
}
