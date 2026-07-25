"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toArabicNumerals } from "@/lib/format";
import {
  DEFAULT_PORTAL_CITY,
  PORTAL_CITY_LIST,
  type PortalCityId,
} from "@/lib/portal-cities";
import {
  formatCountdown,
  getNextPrayer,
  PRAYER_GRID_KEYS,
  type PrayerTimings,
} from "@/lib/next-prayer";
import { STORAGE_KEYS } from "@/lib/storage-keys";

type Timings = PrayerTimings;

type PrayerPayload = {
  timezone?: string | null;
  gregorian: {
    ar: string | null;
    en?: string | null;
    readable: string | null;
  } | null;
  hijri: { ar: string | null; en?: string | null } | null;
  timings: Timings;
};

type QiblaPayload = {
  direction: number;
  directionLabel: string;
};

const CITY_KEY = STORAGE_KEYS.prayerCity;

function formatTime(t: string, locale: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  const formatPart = (part: string) =>
    locale === "ar" ? toArabicNumerals(part) : part;
  return `${formatPart(m[1])}:${formatPart(m[2])}`;
}

export function PrayerTimesCard() {
  const t = useTranslations("Prayer");
  const locale = useLocale();
  const [city, setCity] = useState<string>(DEFAULT_PORTAL_CITY);
  const [data, setData] = useState<PrayerPayload | null>(null);
  const [qibla, setQibla] = useState<QiblaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved && PORTAL_CITY_LIST.some((c) => c.id === saved)) {
        setCity(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async (cityId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [prayerRes, qiblaRes] = await Promise.all([
        fetch(`/api/prayer-times?city=${encodeURIComponent(cityId)}`),
        fetch(`/api/qibla?city=${encodeURIComponent(cityId)}`),
      ]);
      const prayerJson = (await prayerRes.json()) as PrayerPayload & {
        error?: string;
      };
      if (!prayerRes.ok) {
        setData(null);
        setError(t("errorFetch"));
        return;
      }
      setData(prayerJson);
      if (qiblaRes.ok) {
        setQibla((await qiblaRes.json()) as QiblaPayload);
      } else {
        setQibla(null);
      }
    } catch {
      setData(null);
      setQibla(null);
      setError(t("errorConnection"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(city);
  }, [city, load]);

  const onCity = (id: string) => {
    setCity(id);
    try {
      localStorage.setItem(CITY_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const next = useMemo(() => {
    if (!data?.timings) return null;
    return getNextPrayer(
      data.timings,
      data.timezone,
      new Date(nowMs),
    );
  }, [data, nowMs]);

  const remainingLabel = next
    ? formatCountdown(next.atMs - nowMs, locale)
    : null;

  const hijri =
    locale === "ar"
      ? data?.hijri?.ar
      : data?.hijri?.en || data?.hijri?.ar;
  const gregorian =
    locale === "ar"
      ? data?.gregorian?.ar || data?.gregorian?.readable
      : data?.gregorian?.en ||
        data?.gregorian?.readable ||
        data?.gregorian?.ar;

  const formatDegrees = (degrees: number) =>
    locale === "ar" ? toArabicNumerals(Math.round(degrees)) : String(Math.round(degrees));

  return (
    <section className="prayer-panel" aria-labelledby="prayer-h">
      <header className="prayer-panel-head">
        <div>
          <h2 id="prayer-h">{t("title")}</h2>
          <p className="prayer-help">{t("help")}</p>
        </div>
        <label className="prayer-city">
          <span className="sr-only">{t("city")}</span>
          <select
            value={city}
            onChange={(e) => onCity(e.target.value)}
            aria-label={t("citySelect")}
          >
            {PORTAL_CITY_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`cities.${c.id}` as `cities.${PortalCityId}`)}
              </option>
            ))}
          </select>
        </label>
      </header>

      {hijri || gregorian ? (
        <div className="prayer-dates" aria-label={t("date")}>
          {hijri ? (
            <div className="prayer-date-chip">
              <span className="prayer-date-label">{t("hijri")}</span>
              <span className="prayer-date-value">{hijri}</span>
            </div>
          ) : null}
          {gregorian ? (
            <div className="prayer-date-chip">
              <span className="prayer-date-label">{t("gregorian")}</span>
              <span className="prayer-date-value">{gregorian}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? <p className="prayer-status">{t("loading")}</p> : null}
      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {data && !loading ? (
        <>
          <ul className="prayer-grid">
            {PRAYER_GRID_KEYS.map((key) => {
              const isNext = next?.key === key;
              return (
                <li
                  key={key}
                  className={isNext ? "is-next-prayer" : undefined}
                >
                  <span className="prayer-name">
                    {t(`names.${key}` as `names.${keyof PrayerTimings}`)}
                  </span>
                  <span className="prayer-time">
                    {formatTime(data.timings[key], locale)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="prayer-meta-row" aria-label={t("nextPrayer")}>
            {next && remainingLabel ? (
              <div
                className="prayer-meta-chip prayer-next"
                role="timer"
                aria-live="polite"
                aria-atomic="true"
                aria-label={t("nextPrayerAria", {
                  prayer: t(`names.${next.key}` as `names.${keyof PrayerTimings}`),
                  remaining: remainingLabel,
                })}
              >
                <span className="prayer-next-label">{t("nextPrayer")}</span>
                <span className="prayer-next-name">
                  {t(`names.${next.key}` as `names.${keyof PrayerTimings}`)}
                </span>
                <span className="prayer-next-count" dir="ltr">
                  {remainingLabel}
                </span>
              </div>
            ) : null}
            <div className="prayer-meta-chip prayer-qibla">
              <div className="prayer-qibla-row">
                <span className="prayer-qibla-label">{t("qibla")}</span>
                {qibla ? (
                  <>
                    <span
                      className="prayer-qibla-needle"
                      style={{ transform: `rotate(${qibla.direction}deg)` }}
                      aria-hidden
                    />
                    <span className="prayer-qibla-deg">
                      {t("qiblaDegrees", {
                        degrees: formatDegrees(qibla.direction),
                      })}
                    </span>
                  </>
                ) : (
                  <span className="prayer-qibla-deg">{t("qiblaUnavailable")}</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
