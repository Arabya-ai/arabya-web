export type PortalCoords = { lat: number; lon: number };
export type PortalLocationMode = "city" | "coords";

export type PortalLocationQuery =
  | { mode: "city"; cityId: string }
  | { mode: "coords"; lat: number; lon: number };

export function parsePortalCoords(
  latRaw: string,
  lonRaw: string,
): PortalCoords | null {
  if (latRaw.trim() === "" || lonRaw.trim() === "") return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export function portalLocationSearchParams(
  query: PortalLocationQuery,
  locale: string,
): URLSearchParams {
  const params = new URLSearchParams({ lang: locale });
  if (query.mode === "city") {
    params.set("city", query.cityId);
  } else {
    params.set("lat", String(query.lat));
    params.set("lon", String(query.lon));
  }
  return params;
}
