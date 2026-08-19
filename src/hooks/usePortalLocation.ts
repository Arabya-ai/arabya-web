"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_PORTAL_CITY,
  nearestPortalCity,
  PORTAL_CITY_LIST,
  type PortalCityId,
} from "@/lib/portal-cities";
import {
  parsePortalCoords,
  type PortalCoords,
  type PortalLocationMode,
  type PortalLocationQuery,
} from "@/lib/portal-location";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const CITY_KEY = STORAGE_KEYS.prayerCity;
const COORDS_KEY = STORAGE_KEYS.prayerCoords;

type PortalLocationMessages = {
  formatGeoMatched: (cityId: PortalCityId) => string;
  geoDenied: string;
  geoUnsupported: string;
};

export function usePortalLocation(messages: PortalLocationMessages) {
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [city, setCity] = useState<string>(DEFAULT_PORTAL_CITY);
  const [mode, setMode] = useState<PortalLocationMode>("city");
  const [coords, setCoords] = useState<PortalCoords | null>(null);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [coordsInvalid, setCoordsInvalid] = useState(false);
  const [query, setQuery] = useState<PortalLocationQuery | null>(null);
  const [ready, setReady] = useState(false);

  const persistCoords = useCallback((lat: number, lon: number, cityId: string) => {
    try {
      localStorage.setItem(CITY_KEY, cityId);
      localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }));
    } catch {
      /* ignore */
    }
  }, []);

  const applyCoords = useCallback(
    (lat: number, lon: number, showHint = true) => {
      const nearest = nearestPortalCity(lat, lon);
      setMode("coords");
      setCoords({ lat, lon });
      setCity(nearest.id);
      setLatInput(String(lat));
      setLonInput(String(lon));
      setCoordsInvalid(false);
      if (showHint) {
        setGeoHint(messagesRef.current.formatGeoMatched(nearest.id));
      }
      persistCoords(lat, lon, nearest.id);
      setQuery({ mode: "coords", lat, lon });
    },
    [persistCoords],
  );

  const applyCity = useCallback((cityId: string) => {
    setMode("city");
    setCoords(null);
    setLatInput("");
    setLonInput("");
    setGeoHint(null);
    setCoordsInvalid(false);
    setCity(cityId);
    try {
      localStorage.setItem(CITY_KEY, cityId);
    } catch {
      /* ignore */
    }
    setQuery({ mode: "city", cityId });
  }, []);

  useEffect(() => {
    let cancelled = false;

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
          if (!cancelled) {
            applyCoords(parsed.lat, parsed.lon, true);
            setReady(true);
          }
          return;
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const saved = localStorage.getItem(CITY_KEY);
      const initialCity =
        saved && PORTAL_CITY_LIST.some((c) => c.id === saved)
          ? saved
          : DEFAULT_PORTAL_CITY;
      if (!cancelled) {
        applyCity(initialCity);
        setReady(true);
      }
    } catch {
      if (!cancelled) {
        applyCity(DEFAULT_PORTAL_CITY);
        setReady(true);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [applyCity, applyCoords]);

  const onCity = useCallback(
    (cityId: string) => {
      applyCity(cityId);
    },
    [applyCity],
  );

  const onUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoHint(messagesRef.current.geoUnsupported);
      return;
    }
    setGeoBusy(true);
    setGeoHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude, true);
        setGeoBusy(false);
      },
      () => {
        setGeoHint(messagesRef.current.geoDenied);
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }, [applyCoords]);

  const onCalculateCoords = useCallback(() => {
    const parsed = parsePortalCoords(latInput, lonInput);
    if (!parsed) {
      setCoordsInvalid(true);
      return;
    }
    applyCoords(parsed.lat, parsed.lon, true);
  }, [applyCoords, latInput, lonInput]);

  const onToggleMode = useCallback(() => {
    if (mode === "city") {
      setMode("coords");
      setGeoHint(null);
      setCoordsInvalid(false);
      if (coords) {
        setQuery({ mode: "coords", lat: coords.lat, lon: coords.lon });
      }
      return;
    }

    applyCity(city);
  }, [applyCity, city, coords, mode]);

  const clearCoordsInvalid = useCallback(() => {
    setCoordsInvalid(false);
  }, []);

  return {
    city,
    mode,
    coords,
    latInput,
    lonInput,
    setLatInput,
    setLonInput,
    geoBusy,
    geoHint,
    coordsInvalid,
    clearCoordsInvalid,
    query,
    ready,
    onCity,
    onUseLocation,
    onCalculateCoords,
    onToggleMode,
  };
}
