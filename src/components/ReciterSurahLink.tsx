"use client";

import { Link } from "@/i18n/navigation";
import { STORAGE_KEYS } from "@/lib/storage-keys";

/** Opens a mushaf page after selecting this reciter (additive; same mushaf UI). */
export function ReciterSurahLink({
  reciterId,
  href,
  className,
  children,
}: {
  reciterId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        try {
          localStorage.setItem(STORAGE_KEYS.reciter, reciterId);
        } catch {
          /* ignore */
        }
      }}
    >
      {children}
    </Link>
  );
}
