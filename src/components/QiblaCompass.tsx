"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toArabicNumerals } from "@/lib/format";
import {
  DEFAULT_PORTAL_CITY,
  nearestPortalCity,
  PORTAL_CITY_LIST,
  type PortalCityId,
} from "@/lib/portal-cities";
import { STORAGE_KEYS } from "@/lib/storage-keys";

type QiblaPayload = {
  direction: number;
  directionLabel: string;
};

const CITY_KEY = STORAGE_KEYS.prayerCity;

export function QiblaCompass() {
  const t = useTranslations("Qibla");
  const tPrayer = useTranslations("Prayer");
  const locale = useLocale();
  const [city, setCity] = useState<string>(DEFAULT_PORTAL_CITY);
  const [qibla, setQibla] = useState<QiblaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);

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

  const load = useCallback(
    async (cityId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/qibla?city=${encodeURIComponent(cityId)}`);
        const json = (await res.json()) as QiblaPayload & { error?: string };
        if (!res.ok) {
          setQibla(null);
          setError(t("qiblaError"));
          return;
        }
        setQibla(json);
      } catch {
        setQibla(null);
        setError(t("qiblaError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(city);
  }, [city, load]);

  const onCity = (id: string) => {
    setCity(id);
    setGeoHint(null);
    try {
      localStorage.setItem(CITY_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const onUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoHint(tPrayer("geoUnsupported"));
      return;
    }
    setGeoBusy(true);
    setGeoHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestPortalCity(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        onCity(nearest.id);
        setGeoHint(
          tPrayer("geoMatched", {
            city: tPrayer(`cities.${nearest.id}` as `cities.${PortalCityId}`),
          }),
        );
        setGeoBusy(false);
      },
      () => {
        setGeoHint(tPrayer("geoDenied"));
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  const degreesLabel = qibla
    ? locale === "ar"
      ? toArabicNumerals(Math.round(qibla.direction))
      : String(Math.round(qibla.direction))
    : null;

  return (
    <section className="qibla-panel" aria-label={t("tools.qibla")}>
      <header className="qibla-panel-head">
        <div className="prayer-city-controls">
          <label className="prayer-city">
            <span className="sr-only">{tPrayer("city")}</span>
            <select
              value={city}
              onChange={(e) => onCity(e.target.value)}
              aria-label={tPrayer("citySelect")}
            >
              {PORTAL_CITY_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {tPrayer(`cities.${c.id}` as `cities.${PortalCityId}`)}
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
            {geoBusy ? tPrayer("geoLoading") : tPrayer("useLocation")}
          </button>
        </div>
      </header>

      {geoHint ? (
        <p className="prayer-status prayer-status--hint" role="status">
          {geoHint}
        </p>
      ) : null}
      {loading ? <p className="prayer-status">{tPrayer("loading")}</p> : null}
      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {qibla && !loading ? (
        <div className="qibla-compass-wrap">
          <div className="qibla-compass" aria-hidden>
            <span className="qibla-compass-n">{t("qiblaNorth")}</span>
            <span
              className="qibla-needle"
              style={{ transform: `rotate(${qibla.direction}deg)` }}
            />
          </div>
          <p className="qibla-degrees">
            <span dir="ltr">{degreesLabel}°</span> {t("qiblaFromNorth")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
