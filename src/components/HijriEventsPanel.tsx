"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  formatHijriEventDate,
  type HijriEvent,
  upcomingHijriEvents,
} from "@/lib/hijri-events";

type Props = {
  events: HijriEvent[];
};

/**
 * Shows the next fixed hijri observances near today’s prayer/hijri date
 * (uses Aladhan date from prayer-times when available).
 */
export function HijriEventsPanel({ events }: Props) {
  const t = useTranslations("IbadahEvents");
  const locale = useLocale();
  const [upcoming, setUpcoming] = useState<HijriEvent[]>([]);
  const [hijriLabel, setHijriLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/prayer-times?city=cairo");
        if (!res.ok) throw new Error("prayer");
        const data = (await res.json()) as {
          hijri?: {
            day?: string;
            month?: number | null;
            ar?: string | null;
            en?: string | null;
          } | null;
        };
        const month = Number(data.hijri?.month) || 1;
        const day = Number(data.hijri?.day) || 1;
        if (cancelled) return;
        setHijriLabel(
          (locale === "en" ? data.hijri?.en : data.hijri?.ar) ?? null,
        );
        setUpcoming(upcomingHijriEvents(events, month, day, 5));
      } catch {
        if (!cancelled) {
          setUpcoming(upcomingHijriEvents(events, 1, 1, 5));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [events, locale]);

  if (!events.length) return null;

  return (
    <section className="hijri-events-panel" aria-labelledby="hijri-events-h">
      <h2 id="hijri-events-h">{t("title")}</h2>
      <p className="hijri-events-lead">
        {t("lead")}
        {hijriLabel ? (
          <>
            {" "}
            <span className="hijri-events-today">
              {t("today", { date: hijriLabel })}
            </span>
          </>
        ) : null}
      </p>
      <ul className="hijri-events-list">
        {upcoming.map((e) => (
          <li key={e.id}>
            <strong>{locale === "en" ? e.titleEn : e.titleAr}</strong>
            <span>{formatHijriEventDate(e, locale === "en" ? "en" : "ar")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
