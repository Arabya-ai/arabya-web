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

export function resolvePortalCity(raw: string | null | undefined): PortalCity {
  const id = (raw || DEFAULT_PORTAL_CITY).toLowerCase();
  if (id in PORTAL_CITIES) return PORTAL_CITIES[id as PortalCityId];
  return PORTAL_CITIES[DEFAULT_PORTAL_CITY];
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
