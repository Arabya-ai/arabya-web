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
  label: string;
  latitude: number;
  longitude: number;
  /** Aladhan calculation method id */
  method: number;
};

export const DEFAULT_PORTAL_CITY: PortalCityId = "cairo";

export const PORTAL_CITIES: Record<PortalCityId, PortalCity> = {
  cairo: {
    id: "cairo",
    label: "القاهرة",
    latitude: 30.0444,
    longitude: 31.2357,
    method: 5,
  },
  riyadh: {
    id: "riyadh",
    label: "الرياض",
    latitude: 24.7136,
    longitude: 46.6753,
    method: 4,
  },
  makkah: {
    id: "makkah",
    label: "مكة",
    latitude: 21.3891,
    longitude: 39.8579,
    method: 4,
  },
  madinah: {
    id: "madinah",
    label: "المدينة",
    latitude: 24.5247,
    longitude: 39.5692,
    method: 4,
  },
  jeddah: {
    id: "jeddah",
    label: "جدة",
    latitude: 21.4858,
    longitude: 39.1925,
    method: 4,
  },
  amman: {
    id: "amman",
    label: "عمّان",
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
