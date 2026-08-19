"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toArabicNumerals } from "@/lib/format";
import {
  DEFAULT_PORTAL_CITY,
  nearestPortalCity,
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
  place?: { city?: string | null; country?: string | null; displayName?: string | null };
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
const COORDS_KEY = STORAGE_KEYS.prayerCoords;

type Coords = { lat: number; lon: number };
type LocationMode = "city" | "coords";

function parseCoords(latRaw: string, lonRaw: string): Coords | null {
  if (latRaw.trim() === "" || lonRaw.trim() === "") return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;
  return { lat, lon };
}

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
  const [mode, setMode] = useState<LocationMode>("city");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [data, setData] = useState<PrayerPayload | null>(null);
  const [qibla, setQibla] = useState<QiblaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  useEffect(() => {
    let loadedFromCoords = false;

    const loadInitialCity = (cityId: string) => {
      setMode("city");
      setCoords(null);
      setLatInput("");
      setLonInput("");
      setCity(cityId);
      void loadCity(cityId);
    };

    try {
      const savedCoordsRaw = localStorage.getItem(COORDS_KEY);
      if (savedCoordsRaw) {
        const parsed = JSON.parse(savedCoordsRaw) as {
          lat?: unknown;
          lon?: unknown;
        };
        if (
          typeof parsed?.lat === "number" &&
          typeof parsed?.lon === "number" &&
          parsed.lat >= -90 &&
          parsed.lat <= 90 &&
          parsed.lon >= -180 &&
          parsed.lon <= 180
        ) {
          const nearest = nearestPortalCity(parsed.lat, parsed.lon);
          setMode("coords");
          setCoords({ lat: parsed.lat, lon: parsed.lon });
          setCity(nearest.id);
          setLatInput(String(parsed.lat));
          setLonInput(String(parsed.lon));
          setGeoHint(
            t("geoMatched", {
              city: t(`cities.${nearest.id}` as `cities.${PortalCityId}`),
            }),
          );
          loadedFromCoords = true;
          void loadCoords(parsed.lat, parsed.lon);
        }
      }
    } catch {
      /* ignore */
    }

    if (loadedFromCoords) return;

    try {
      const saved = localStorage.getItem(CITY_KEY);
      const initialCity =
        saved && PORTAL_CITY_LIST.some((c) => c.id === saved)
          ? saved
          : DEFAULT_PORTAL_CITY;
      setGeoHint(null);
      loadInitialCity(initialCity);
    } catch {
      setGeoHint(null);
      loadInitialCity(DEFAULT_PORTAL_CITY);
    }
  // Intentionally run once on mount; actual fetch handlers are closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadCity = useCallback(
    async (cityId: string) => {
      setLoading(true);
      setError(null);
      try {
        const [prayerRes, qiblaRes] = await Promise.all([
          fetch(
            `/api/prayer-times?city=${encodeURIComponent(cityId)}&lang=${encodeURIComponent(locale)}`,
          ),
          fetch(
            `/api/qibla?city=${encodeURIComponent(cityId)}&lang=${encodeURIComponent(locale)}`,
          ),
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
    },
    [locale, t],
  );

  const loadCoords = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);
      try {
        const [prayerRes, qiblaRes] = await Promise.all([
          fetch(
            `/api/prayer-times?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&lang=${encodeURIComponent(locale)}`,
          ),
          fetch(
            `/api/qibla?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&lang=${encodeURIComponent(locale)}`,
          ),
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
    },
    [locale, t],
  );

  const onCity = (id: string) => {
    setMode("city");
    setCoords(null);
    setLatInput("");
    setLonInput("");
    setGeoHint(null);
    setError(null);
    setCity(id);
    try {
      localStorage.setItem(CITY_KEY, id);
    } catch {
      /* ignore */
    }
    void loadCity(id);
  };

  const onUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoHint(t("geoUnsupported"));
      return;
    }
    setGeoBusy(true);
    setGeoHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const nearest = nearestPortalCity(lat, lon);

        setMode("coords");
        setCoords({ lat, lon });
        setCity(nearest.id);
        setLatInput(String(lat));
        setLonInput(String(lon));

        try {
          localStorage.setItem(CITY_KEY, nearest.id);
          localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }));
        } catch {
          /* ignore */
        }

        setGeoHint(
          t("geoMatched", {
            city: t(`cities.${nearest.id}` as `cities.${PortalCityId}`),
          }),
        );
        setGeoBusy(false);
        void loadCoords(lat, lon);
      },
      () => {
        setGeoHint(t("geoDenied"));
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  const onCalculateCoords = useCallback(() => {
    const parsed = parseCoords(latInput, lonInput);
    if (!parsed) {
      setData(null);
      setQibla(null);
      setError(t("coordsInvalid"));
      return;
    }
    const nearest = nearestPortalCity(parsed.lat, parsed.lon);
    setMode("coords");
    setCoords(parsed);
    setCity(nearest.id);
    setGeoHint(
      t("geoMatched", {
        city: t(`cities.${nearest.id}` as `cities.${PortalCityId}`),
      }),
    );
    setError(null);
    try {
      localStorage.setItem(CITY_KEY, nearest.id);
      localStorage.setItem(COORDS_KEY, JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
    void loadCoords(parsed.lat, parsed.lon);
  }, [latInput, lonInput, loadCoords, t]);

  const onToggleMode = useCallback(() => {
    if (mode === "city") {
      setMode("coords");
      setGeoHint(null);
      setError(null);
      if (coords) {
        void loadCoords(coords.lat, coords.lon);
      }
      return;
    }

    setMode("city");
    setCoords(null);
    setGeoHint(null);
    setError(null);
    setLatInput("");
    setLonInput("");
    void loadCity(city);
  }, [city, coords, loadCity, loadCoords, mode]);

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
        <div className="prayer-city-controls">
          <label className="prayer-city">
            <span className="sr-only">{t("city")}</span>
            <select
              value={city}
              onChange={(e) => onCity(e.target.value)}
              aria-label={t("citySelect")}
              disabled={mode === "coords"}
            >
              {PORTAL_CITY_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(`cities.${c.id}` as `cities.${PortalCityId}`)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="prayer-geo-btn"
            onClick={onUseLocation}
            disabled={geoBusy}
          >
            {geoBusy ? t("geoLoading") : t("useLocation")}
          </button>
          <button
            type="button"
            className="nav-pill"
            onClick={onToggleMode}
            aria-pressed={mode === "coords"}
          >
            {mode === "coords" ? t("useCity") : t("useCoords")}
          </button>
        </div>
      </header>

      {mode === "coords" ? (
        <form
          className="prayer-coords-form"
          onSubmit={(e) => {
            e.preventDefault();
            onCalculateCoords();
          }}
        >
          <p className="prayer-coords-hint">{t("coordsHint")}</p>
          <div className="prayer-coords-grid">
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{t("latLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lat"
                value={latInput}
                placeholder={t("latPlaceholder")}
                onChange={(e) => setLatInput(e.target.value)}
              />
            </label>
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{t("lonLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lon"
                value={lonInput}
                placeholder={t("lonPlaceholder")}
                onChange={(e) => setLonInput(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="prayer-geo-btn"
              disabled={geoBusy || loading}
            >
              {t("coordsCalculate")}
            </button>
          </div>
        </form>
      ) : null}

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

      {geoHint ? (
        <p className="prayer-status prayer-status--hint" role="status">
          {geoHint}
        </p>
      ) : null}
      {data?.place?.displayName ? (
        <p className="prayer-status prayer-status--hint" role="status">
          {data.place.displayName}
        </p>
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
