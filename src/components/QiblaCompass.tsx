"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toArabicNumerals } from "@/lib/format";
import { usePortalLocation } from "@/hooks/usePortalLocation";
import {
  PORTAL_CITY_LIST,
  type PortalCityId,
} from "@/lib/portal-cities";
import { portalLocationSearchParams } from "@/lib/portal-location";

type QiblaPayload = {
  direction: number;
  directionLabel: string;
  source?: string;
  offline?: boolean;
  approxCity?: PortalCityId;
  place?: { city?: string | null; country?: string | null; displayName?: string | null };
};

type OrientationPermission = "unknown" | "granted" | "denied" | "unsupported";

function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function QiblaCompass() {
  const t = useTranslations("Qibla");
  const tPrayer = useTranslations("Prayer");
  const locale = useLocale();
  const [qibla, setQibla] = useState<QiblaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [orientPerm, setOrientPerm] = useState<OrientationPermission>("unknown");

  const loc = usePortalLocation({
    formatGeoMatched: (id) =>
      tPrayer("geoMatched", {
        city: tPrayer(`cities.${id}` as `cities.${PortalCityId}`),
      }),
    geoDenied: tPrayer("geoDenied"),
    geoUnsupported: tPrayer("geoUnsupported"),
  });

  const fetchQibla = useCallback(
    async (params: URLSearchParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/qibla?${params.toString()}`);
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
    if (!loc.ready || !loc.query) return;
    const params = portalLocationSearchParams(loc.query, locale);
    void fetchQibla(params);
  }, [fetchQibla, locale, loc.query, loc.ready]);

  useEffect(() => {
    if (loc.coordsInvalid) {
      setQibla(null);
      setError(tPrayer("coordsInvalid"));
    }
  }, [loc.coordsInvalid, tPrayer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasAbsolute = "ondeviceorientationabsolute" in window;
    const hasRelative = "ondeviceorientation" in window;
    if (!hasAbsolute && !hasRelative) {
      setOrientPerm("unsupported");
      return;
    }
    setOrientPerm("unknown");
  }, []);

  const attachOrientation = useCallback(() => {
    function onAbsolute(ev: DeviceOrientationEvent) {
      const anyEv = ev as DeviceOrientationEvent & { absolute?: boolean };
      if (typeof anyEv.alpha !== "number") return;
      // alpha: degrees from north (browser-dependent); prefer absolute when flagged
      setHeading(normalizeHeading(360 - anyEv.alpha));
    }
    function onRelative(ev: DeviceOrientationEvent) {
      if (typeof ev.alpha !== "number") return;
      setHeading(normalizeHeading(360 - ev.alpha));
    }

    window.addEventListener("deviceorientationabsolute", onAbsolute);
    window.addEventListener("deviceorientation", onRelative);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onAbsolute);
      window.removeEventListener("deviceorientation", onRelative);
    };
  }, []);

  const enableCompass = useCallback(async () => {
    const Doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      if (typeof Doe.requestPermission === "function") {
        const state = await Doe.requestPermission();
        if (state !== "granted") {
          setOrientPerm("denied");
          return;
        }
      }
      setOrientPerm("granted");
    } catch {
      setOrientPerm("denied");
    }
  }, []);

  useEffect(() => {
    if (orientPerm !== "granted") return;
    return attachOrientation();
  }, [attachOrientation, orientPerm]);

  const degreesLabel = qibla
    ? locale === "ar"
      ? toArabicNumerals(Math.round(qibla.direction))
      : String(Math.round(qibla.direction))
    : null;

  const needleRotation = useMemo(() => {
    if (!qibla) return 0;
    if (heading == null) return qibla.direction;
    return normalizeHeading(qibla.direction - heading);
  }, [heading, qibla]);

  const dialRotation = heading == null ? 0 : -heading;

  return (
    <section className="qibla-panel" aria-label={t("title")}>
      <header className="qibla-panel-head">
        <div className="prayer-city-controls">
          <label className="prayer-city">
            <span className="sr-only">{tPrayer("city")}</span>
            <select
              value={loc.city}
              onChange={(e) => loc.onCity(e.target.value)}
              aria-label={tPrayer("citySelect")}
              disabled={loc.mode === "coords"}
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
            onClick={loc.onUseLocation}
            disabled={loc.geoBusy}
          >
            {loc.geoBusy ? tPrayer("geoLoading") : tPrayer("useLocation")}
          </button>
          <button
            type="button"
            className="nav-pill"
            onClick={loc.onToggleMode}
            aria-pressed={loc.mode === "coords"}
          >
            {loc.mode === "coords" ? tPrayer("useCity") : tPrayer("useCoords")}
          </button>
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
          <p className="prayer-coords-hint">{tPrayer("coordsHint")}</p>
          <div className="prayer-coords-grid">
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{tPrayer("latLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lat"
                value={loc.latInput}
                placeholder={tPrayer("latPlaceholder")}
                onChange={(e) => loc.setLatInput(e.target.value)}
              />
            </label>
            <label className="prayer-coords-field">
              <span className="prayer-coords-label">{tPrayer("lonLabel")}</span>
              <input
                className="prayer-coords-input"
                inputMode="decimal"
                name="lon"
                value={loc.lonInput}
                placeholder={tPrayer("lonPlaceholder")}
                onChange={(e) => loc.setLonInput(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="prayer-geo-btn"
              disabled={loc.geoBusy || loading}
            >
              {tPrayer("coordsCalculate")}
            </button>
          </div>
        </form>
      ) : null}

      {loc.geoHint ? (
        <p className="prayer-status prayer-status--hint" role="status">
          {loc.geoHint}
        </p>
      ) : null}
      {qibla?.place?.displayName ? (
        <p className="prayer-status prayer-status--hint" role="status">
          {qibla.place.displayName}
        </p>
      ) : null}
      {loading ? <p className="prayer-status">{tPrayer("loading")}</p> : null}
      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {qibla && !loading ? (
        <div className="qibla-compass-wrap">
          <div
            className="qibla-compass"
            aria-hidden
            style={{ transform: `rotate(${dialRotation}deg)` }}
          >
            <span className="qibla-compass-n">{t("qiblaNorth")}</span>
            <span
              className="qibla-needle"
              style={{ transform: `rotate(${qibla.direction}deg)` }}
            />
          </div>
          <p className="qibla-degrees">
            <span dir="ltr">{degreesLabel}°</span> {t("qiblaFromNorth")}
          </p>
          {heading != null ? (
            <p className="prayer-status prayer-status--hint" role="status">
              {t("liveCompassHint", {
                turn: locale === "ar"
                  ? toArabicNumerals(Math.round(needleRotation))
                  : String(Math.round(needleRotation)),
              })}
            </p>
          ) : null}
          {orientPerm === "unsupported" ? (
            <p className="prayer-status prayer-status--hint">{t("compassUnsupported")}</p>
          ) : orientPerm !== "granted" ? (
            <button type="button" className="prayer-geo-btn" onClick={() => void enableCompass()}>
              {t("enableLiveCompass")}
            </button>
          ) : null}
          {qibla.offline || qibla.source === "adhan-js" ? (
            <p className="prayer-status prayer-status--hint" role="status">
              {t("localCalcNote")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
