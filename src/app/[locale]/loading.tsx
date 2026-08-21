export default function LocaleLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center px-4 text-center text-[var(--ink-muted,#5c6b68)]"
      role="status"
      aria-live="polite"
    >
      جاري التحميل…
    </div>
  );
}
