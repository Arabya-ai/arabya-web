"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell page-block">
      <h1>حدث خطأ</h1>
      <p>تعذّر تحميل هذه الصفحة. حاول مرة أخرى.</p>
      <p className="error-actions">
        <button type="button" className="nav-pill" onClick={reset}>
          إعادة المحاولة
        </button>{" "}
        <Link href="/" className="nav-pill">
          الفهرس
        </Link>
      </p>
    </div>
  );
}
