"use client";

import { useCallback, useEffect, useState } from "react";
import { toArabicNumerals } from "@/lib/format";
import {
  DEFAULT_PORTAL_CITY,
  PORTAL_CITY_LIST,
} from "@/lib/portal-cities";

type Timings = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type PrayerPayload = {
  cityLabel: string;
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

  const hijri = data?.hijri?.ar;
  const gregorian = data?.gregorian?.ar || data?.gregorian?.readable;

  return (
    <section className="prayer-panel" aria-labelledby="prayer-h">
      <header className="prayer-panel-head">
        <div>
          <h2 id="prayer-h">مواقيت الصلاة والقبلة</h2>
          <p className="prayer-help">
            مواقيت اليوم واتجاه القبلة عبر Aladhan — المدينة الافتراضية:
            القاهرة.
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
        <p className="prayer-dates">
          {hijri ? <span className="prayer-hijri">{hijri}</span> : null}
          {hijri && gregorian ? (
            <span className="prayer-date-sep" aria-hidden>
              ·
            </span>
          ) : null}
          {gregorian ? (
            <span className="prayer-gregorian">{gregorian}</span>
          ) : null}
        </p>
      ) : null}

      {loading ? <p className="prayer-status">جاري التحميل…</p> : null}
      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {data && !loading ? (
        <>
          <ul className="prayer-grid">
            {LABELS.map((row) => (
              <li key={row.key}>
                <span className="prayer-name">{row.ar}</span>
                <span className="prayer-time">
                  {toDisplayTime(data.timings[row.key])}
                </span>
              </li>
            ))}
          </ul>
          {qibla ? (
            <p className="prayer-qibla" aria-label="اتجاه القبلة">
              <span className="prayer-qibla-label">القبلة</span>
              <span
                className="prayer-qibla-needle"
                style={{ transform: `rotate(${qibla.direction}deg)` }}
                aria-hidden
              />
              <span className="prayer-qibla-deg">
                {toArabicNumerals(Math.round(qibla.direction))}° من الشمال
              </span>
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
