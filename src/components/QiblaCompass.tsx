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
  approxCity?: PortalCityId;
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

export function QiblaCompass() {
  const t = useTranslations("Qibla");
  const tPrayer = useTranslations("Prayer");
  const locale = useLocale();
  const [city, setCity] = useState<string>(DEFAULT_PORTAL_CITY);
  const [mode, setMode] = useState<LocationMode>("city");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [qibla, setQibla] = useState<QiblaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  const loadCity = useCallback(
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

  const loadCoords = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/qibla?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
        );
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
    let loadedFromCoords = false;

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
      setMode("city");
      setCoords(null);
      setLatInput("");
      setLonInput("");
      setCity(initialCity);
      void loadCity(initialCity);
    } catch {
      setMode("city");
      setCoords(null);
      setLatInput("");
      setLonInput("");
      setCity(DEFAULT_PORTAL_CITY);
      void loadCity(DEFAULT_PORTAL_CITY);
    }
  }, [loadCity, loadCoords]);

  const onCity = (id: string) => {
    setMode("city");
    setCoords(null);
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
      setGeoHint(tPrayer("geoUnsupported"));
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
          tPrayer("geoMatched", {
            city: tPrayer(`cities.${nearest.id}` as `cities.${PortalCityId}`),
          }),
        );
        setGeoBusy(false);
        void loadCoords(lat, lon);
      },
      () => {
        setGeoHint(tPrayer("geoDenied"));
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  const onCalculateCoords = useCallback(() => {
    const parsed = parseCoords(latInput, lonInput);
    if (!parsed) {
      setQibla(null);
      setError(tPrayer("coordsInvalid"));
      return;
    }
    const nearest = nearestPortalCity(parsed.lat, parsed.lon);

    setMode("coords");
    setCoords(parsed);
    setCity(nearest.id);
    setGeoHint(
      tPrayer("geoMatched", {
        city: tPrayer(`cities.${nearest.id}` as `cities.${PortalCityId}`),
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
  }, [latInput, lonInput, loadCoords, tPrayer]);

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
  }, [coords, city, loadCity, loadCoords, mode]);

  const degreesLabel = qibla
    ? locale === "ar"
      ? toArabicNumerals(Math.round(qibla.direction))
      : String(Math.round(qibla.direction))
    : null;

  return (
    <section className="qibla-panel" aria-label={t("title")}>
      <header className="qibla-panel-head">
        <div className="prayer-city-controls">
          <label className="prayer-city">
            <span className="sr-only">{tPrayer("city")}</span>
            <select
              value={city}
              onChange={(e) => onCity(e.target.value)}
              aria-label={tPrayer("citySelect")}
              disabled={mode === "coords"}
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
          <button
            type="button"
            className="nav-pill"
            onClick={onToggleMode}
            aria-pressed={mode === "coords"}
          >
            {mode === "coords" ? tPrayer("useCity") : tPrayer("useCoords")}
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
          <p className="prayer-coords-hint">{tPrayer("coordsHint")}</p>
          <div className="prayer-coords-grid">
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{tPrayer("latLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lat"
                value={latInput}
                placeholder={tPrayer("latPlaceholder")}
                onChange={(e) => setLatInput(e.target.value)}
              />
            </label>
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{tPrayer("lonLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lon"
                value={lonInput}
                placeholder={tPrayer("lonPlaceholder")}
                onChange={(e) => setLonInput(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="prayer-geo-btn"
              disabled={geoBusy || loading}
            >
              {tPrayer("coordsCalculate")}
            </button>
          </div>
        </form>
      ) : null}

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
