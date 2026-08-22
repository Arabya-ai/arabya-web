import { notFound } from "next/navigation";

/** Catch unknown paths under [locale] so `not-found.tsx` renders (next-intl). */
export default function LocaleCatchAll() {
  notFound();
}
