/** Shared city presets for portal APIs (prayer, qibla). */

export type PortalCityId =
  | "cairo"
  | "riyadh"
  | "makkah"
  | "madinah"
  | "jeddah"
  | "amman";

export type PortalCity = {
  id: PortalCityId;
  latitude: number;
  longitude: number;
  /** Aladhan calculation method id */
  method: number;
};

export const DEFAULT_PORTAL_CITY: PortalCityId = "cairo";

export const PORTAL_CITIES: Record<PortalCityId, PortalCity> = {
  cairo: {
    id: "cairo",
    latitude: 30.0444,
    longitude: 31.2357,
    method: 5,
  },
  riyadh: {
    id: "riyadh",
    latitude: 24.7136,
    longitude: 46.6753,
    method: 4,
  },
  makkah: {
    id: "makkah",
    latitude: 21.3891,
    longitude: 39.8579,
    method: 4,
  },
  madinah: {
    id: "madinah",
    latitude: 24.5247,
    longitude: 39.5692,
    method: 4,
  },
  jeddah: {
    id: "jeddah",
    latitude: 21.4858,
    longitude: 39.1925,
    method: 4,
  },
  amman: {
    id: "amman",
    latitude: 31.9539,
    longitude: 35.9106,
    method: 3,
  },
};

export const PORTAL_CITY_LIST = Object.values(PORTAL_CITIES);

/** True when `raw` is an allowlisted portal city id. */
export function isPortalCityId(raw: string | null | undefined): raw is PortalCityId {
  if (!raw) return false;
  return raw.toLowerCase() in PORTAL_CITIES;
}

/**
 * Resolve a city from an explicit allowlist value.
 * Returns null when the value is present but unknown (callers must 400).
 * When raw is null/empty, returns the product default (Cairo) — UI default only.
 */
export function resolvePortalCity(
  raw: string | null | undefined,
): PortalCity | null {
  if (raw == null || String(raw).trim() === "") {
    return PORTAL_CITIES[DEFAULT_PORTAL_CITY];
  }
  const id = String(raw).trim().toLowerCase();
  if (id in PORTAL_CITIES) return PORTAL_CITIES[id as PortalCityId];
  return null;
}

/** Parse GPS query params; returns null when missing or out of range. */
export function parsePortalCoords(
  latRaw: string | null | undefined,
  lonRaw: string | null | undefined,
): { latitude: number; longitude: number } | null {
  if (latRaw == null || lonRaw == null) return null;
  if (String(latRaw).trim() === "" || String(lonRaw).trim() === "") return null;
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export type ResolvedPortalLocation = PortalCity & {
  /** When GPS used: nearest curated city id for method stability. */
  approxCity?: PortalCityId;
};

/**
 * Resolve city / GPS from request search params.
 * - Invalid city or coords → error code (callers return HTTP 400).
 * - Empty params → default Cairo (UI default).
 */
export function resolvePortalLocationFromSearch(
  searchParams: URLSearchParams,
):
  | { ok: true; cfg: ResolvedPortalLocation }
  | { ok: false; code: "invalid_city" | "invalid_coordinates" } {
  const cityRaw = searchParams.get("city");
  const hasLat = searchParams.has("lat");
  const hasLon = searchParams.has("lon");

  if (hasLat || hasLon) {
    const coords = parsePortalCoords(
      searchParams.get("lat"),
      searchParams.get("lon"),
    );
    if (!coords) return { ok: false, code: "invalid_coordinates" };
    const nearest = nearestPortalCity(coords.latitude, coords.longitude);
    return {
      ok: true,
      cfg: {
        ...nearest,
        latitude: coords.latitude,
        longitude: coords.longitude,
        approxCity: nearest.id,
      },
    };
  }

  if (cityRaw != null && String(cityRaw).trim() !== "") {
    const city = resolvePortalCity(cityRaw);
    if (!city) return { ok: false, code: "invalid_city" };
    return { ok: true, cfg: city };
  }

  return { ok: true, cfg: resolvePortalCity(null)! };
}

/** Haversine distance in km between two WGS84 points. */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/** Nearest curated portal city for a GPS fix (keeps Aladhan methods stable). */
export function nearestPortalCity(
  latitude: number,
  longitude: number,
): PortalCity {
  let best = PORTAL_CITIES[DEFAULT_PORTAL_CITY];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const city of PORTAL_CITY_LIST) {
    const km = haversineKm(
      latitude,
      longitude,
      city.latitude,
      city.longitude,
    );
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return best;
}
