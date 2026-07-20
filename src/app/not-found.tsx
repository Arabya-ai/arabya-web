import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell page-block">
      <h1>الصفحة غير موجودة</h1>
      <p>عذرًا، لم نعثر على الصفحة المطلوبة.</p>
      <p>
        <Link href="/">العودة إلى فهرس السور</Link>
      </p>
    </div>
  );
}
