"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toArabicNumerals } from "@/lib/format";
import { usePortalLocation } from "@/hooks/usePortalLocation";
import {
  PORTAL_CITY_LIST,
  type PortalCityId,
} from "@/lib/portal-cities";
import {
  formatCountdown,
  getNextPrayer,
  PRAYER_GRID_KEYS,
  type PrayerTimings,
} from "@/lib/next-prayer";
import {
  appendPrayerUserParams,
  PRAYER_METHOD_OPTIONS,
  readPrayerUserPrefs,
  writePrayerUserPrefs,
} from "@/lib/prayer-user-prefs";
import { portalLocationSearchParams } from "@/lib/portal-location";

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
  const [data, setData] = useState<PrayerPayload | null>(null);
  const [qibla, setQibla] = useState<QiblaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loc = usePortalLocation({
    formatGeoMatched: (id) =>
      t("geoMatched", {
        city: t(`cities.${id}` as `cities.${PortalCityId}`),
      }),
    geoDenied: t("geoDenied"),
    geoUnsupported: t("geoUnsupported"),
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [prefs, setPrefs] = useState(() =>
    typeof window !== "undefined" ? readPrayerUserPrefs() : { method: 5, school: 0 as const },
  );

  useEffect(() => {
    function refresh() {
      setPrefs(readPrayerUserPrefs());
    }
    refresh();
    window.addEventListener("arabya-prayer-prefs-updated", refresh);
    return () => window.removeEventListener("arabya-prayer-prefs-updated", refresh);
  }, []);

  const fetchPrayerData = useCallback(
    async (params: URLSearchParams) => {
      setLoading(true);
      setError(null);
      try {
        appendPrayerUserParams(params);
        const [prayerRes, qiblaRes] = await Promise.all([
          fetch(`/api/prayer-times?${params.toString()}`),
          fetch(`/api/qibla?${params.toString()}`),
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
    [t],
  );

  useEffect(() => {
    if (!loc.ready || !loc.query) return;
    const params = portalLocationSearchParams(loc.query, locale);
    void fetchPrayerData(params);
  }, [fetchPrayerData, locale, loc.query, loc.ready]);

  useEffect(() => {
    if (loc.coordsInvalid) {
      setData(null);
      setQibla(null);
      setError(t("coordsInvalid"));
    }
  }, [loc.coordsInvalid, t]);

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
              value={loc.city}
              onChange={(e) => loc.onCity(e.target.value)}
              aria-label={t("citySelect")}
              disabled={loc.mode === "coords"}
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
            onClick={loc.onUseLocation}
            disabled={loc.geoBusy}
          >
            {loc.geoBusy ? t("geoLoading") : t("useLocation")}
          </button>
          <button
            type="button"
            className="nav-pill"
            onClick={loc.onToggleMode}
            aria-pressed={loc.mode === "coords"}
          >
            {loc.mode === "coords" ? t("useCity") : t("useCoords")}
          </button>
        </div>
        <div className="prayer-city-controls" style={{ marginTop: "0.5rem" }}>
          <label className="prayer-city">
            <span className="sr-only">
              {locale === "en" ? "Calculation method" : "طريقة الحساب"}
            </span>
            <select
              value={prefs.method}
              aria-label={locale === "en" ? "Calculation method" : "طريقة الحساب"}
              onChange={(e) => {
                const method = Number(e.target.value);
                writePrayerUserPrefs({ ...prefs, method });
                if (loc.ready && loc.query) {
                  const params = portalLocationSearchParams(loc.query, locale);
                  void fetchPrayerData(params);
                }
              }}
            >
              {PRAYER_METHOD_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {locale === "en" ? m.labelEn : m.labelAr}
                </option>
              ))}
            </select>
          </label>
          <label className="prayer-city">
            <span className="sr-only">
              {locale === "en" ? "Asr school" : "مذهب العصر"}
            </span>
            <select
              value={prefs.school}
              aria-label={locale === "en" ? "Asr school" : "مذهب العصر"}
              onChange={(e) => {
                const school = Number(e.target.value) === 1 ? 1 : 0;
                writePrayerUserPrefs({ ...prefs, school });
                if (loc.ready && loc.query) {
                  const params = portalLocationSearchParams(loc.query, locale);
                  void fetchPrayerData(params);
                }
              }}
            >
              <option value={0}>
                {locale === "en" ? "Shafi (standard)" : "شافعي (معياري)"}
              </option>
              <option value={1}>
                {locale === "en" ? "Hanafi" : "حنفي"}
              </option>
            </select>
          </label>
        </div>
      </header>

      {loc.mode === "coords" ? (
        <form
          className="prayer-coords-form"
          onSubmit={(e) => {
            e.preventDefault();
            loc.onCalculateCoords();
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
                value={loc.latInput}
                placeholder={t("latPlaceholder")}
                onChange={(e) => loc.setLatInput(e.target.value)}
              />
            </label>
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{t("lonLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lon"
                value={loc.lonInput}
                placeholder={t("lonPlaceholder")}
                onChange={(e) => loc.setLonInput(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="prayer-geo-btn"
              disabled={loc.geoBusy || loading}
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

      {loc.geoHint ? (
        <p className="prayer-status prayer-status--hint" role="status">
          {loc.geoHint}
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
