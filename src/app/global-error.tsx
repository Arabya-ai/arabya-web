"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * App Router global error boundary — reports to Sentry when DSN is set.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: "Tahoma, 'Noto Sans Arabic', sans-serif",
          padding: "2rem",
          background: "#f0fdfa",
          color: "#134e4a",
        }}
      >
        <h1 style={{ color: "#0f766e" }}>حدث خطأ غير متوقع</h1>
        <p>تم تسجيل المشكلة للمتابعة إن كان Sentry مفعّلًا على Contabo.</p>
        {error.digest ? (
          <p style={{ opacity: 0.75 }} dir="ltr">
            digest: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            background: "#0d9488",
            color: "#fff",
            border: 0,
            padding: "0.55rem 1rem",
            cursor: "pointer",
          }}
        >
          إعادة المحاولة
        </button>
      </body>
    </html>
  );
}
