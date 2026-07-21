"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toArabicNumerals } from "@/lib/format";
import {
  DEFAULT_PORTAL_CITY,
  PORTAL_CITY_LIST,
} from "@/lib/portal-cities";
import {
  formatCountdown,
  getNextPrayer,
  type PrayerTimings,
} from "@/lib/next-prayer";

type Timings = PrayerTimings;

type PrayerPayload = {
  cityLabel: string;
  timezone?: string | null;
  gregorian: { ar: string | null; readable: string | null } | null;
  hijri: { ar: string | null } | null;
  timings: Timings;
};

type QiblaPayload = {
  direction: number;
  directionLabel: string;
};

const CITY_KEY = "arabya-prayer-city";

const LABELS: { key: keyof Timings; ar: string }[] = [
  { key: "fajr", ar: "الفجر" },
  { key: "sunrise", ar: "الشروق" },
  { key: "dhuhr", ar: "الظهر" },
  { key: "asr", ar: "العصر" },
  { key: "maghrib", ar: "المغرب" },
  { key: "isha", ar: "العشاء" },
];

function toDisplayTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${toArabicNumerals(m[1])}:${toArabicNumerals(m[2])}`;
}

export function PrayerTimesCard() {
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
        setError("تعذّر جلب المواقيت");
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
      setError("تعذّر الاتصال بخدمات المواقيت والقبلة");
    } finally {
      setLoading(false);
    }
  }, []);

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
    ? formatCountdown(next.atMs - nowMs)
    : null;

  const hijri = data?.hijri?.ar;
  const gregorian = data?.gregorian?.ar || data?.gregorian?.readable;

  return (
    <section className="prayer-panel" aria-labelledby="prayer-h">
      <header className="prayer-panel-head">
        <div>
          <h2 id="prayer-h">مواقيت الصلاة والقبلة</h2>
          <p className="prayer-help">
            مواقيت اليوم واتجاه القبلة — المدينة الافتراضية: القاهرة.
          </p>
        </div>
        <label className="prayer-city">
          <span className="sr-only">المدينة</span>
          <select
            value={city}
            onChange={(e) => onCity(e.target.value)}
            aria-label="اختر المدينة"
          >
            {PORTAL_CITY_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {hijri || gregorian ? (
        <div className="prayer-dates" aria-label="التاريخ">
          {hijri ? (
            <div className="prayer-date-chip">
              <span className="prayer-date-label">هجري</span>
              <span className="prayer-date-value">{hijri}</span>
            </div>
          ) : null}
          {gregorian ? (
            <div className="prayer-date-chip">
              <span className="prayer-date-label">ميلادي</span>
              <span className="prayer-date-value">{gregorian}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? <p className="prayer-status">جاري التحميل…</p> : null}
      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {data && !loading ? (
        <>
          <ul className="prayer-grid">
            {LABELS.map((row) => {
              const isNext = next?.key === row.key;
              return (
                <li
                  key={row.key}
                  className={isNext ? "is-next-prayer" : undefined}
                >
                  <span className="prayer-name">{row.ar}</span>
                  <span className="prayer-time">
                    {toDisplayTime(data.timings[row.key])}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="prayer-meta-row" aria-label="الصلاة التالية والقبلة">
            {next && remainingLabel ? (
              <div
                className="prayer-meta-chip prayer-next"
                role="timer"
                aria-live="polite"
                aria-atomic="true"
                aria-label={`الصلاة التالية ${next.labelAr}، متبقٍ ${remainingLabel}`}
              >
                <span className="prayer-next-label">الصلاة التالية</span>
                <span className="prayer-next-name">{next.labelAr}</span>
                <span className="prayer-next-count" dir="ltr">
                  {remainingLabel}
                </span>
              </div>
            ) : null}
            <div className="prayer-meta-chip prayer-qibla">
              <div className="prayer-qibla-row">
                <span className="prayer-qibla-label">القبلة</span>
                {qibla ? (
                  <>
                    <span
                      className="prayer-qibla-needle"
                      style={{ transform: `rotate(${qibla.direction}deg)` }}
                      aria-hidden
                    />
                    <span className="prayer-qibla-deg">
                      {toArabicNumerals(Math.round(qibla.direction))}° من
                      الشمال
                    </span>
                  </>
                ) : (
                  <span className="prayer-qibla-deg">غير متاح</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
