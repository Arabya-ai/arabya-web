type ReversePlace = {
  city: string | null;
  country: string | null;
  displayName: string | null;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h
const cache = new Map<string, { expiresAt: number; place: ReversePlace }>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function pickCity(address: Record<string, unknown> | null | undefined): string | null {
  if (!address) return null;
  const keys = ["city", "town", "village", "municipality", "county", "state_district"] as const;
  for (const k of keys) {
    const value = address[k];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function reverseGeocodePlace(
  latitude: number,
  longitude: number,
  locale: "ar" | "en" = "ar",
): Promise<ReversePlace | null> {
  const key = cacheKey(latitude, longitude);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.place;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("accept-language", locale);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Arabya/1.0 (reverse-geocode)",
      },
      // Keep request bounded to avoid impacting prayer/qibla response latency.
      signal: AbortSignal.timeout(2500),
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      address?: Record<string, unknown>;
      display_name?: string;
    };
    const city = pickCity(json.address);
    const country =
      typeof json.address?.country === "string" ? json.address.country.trim() : null;
    const displayName =
      typeof json.display_name === "string" && json.display_name.trim()
        ? json.display_name.trim()
        : [city, country].filter(Boolean).join("، ") || null;

    const place: ReversePlace = { city, country, displayName };
    cache.set(key, { place, expiresAt: now + CACHE_TTL_MS });
    return place;
  } catch {
    return null;
  }
}

export async function reverseGeocodePlaceBounded(
  latitude: number,
  longitude: number,
  locale: "ar" | "en" = "ar",
  maxWaitMs = 400,
): Promise<ReversePlace | null> {
  const boundedMs = Number.isFinite(maxWaitMs)
    ? Math.max(100, Math.min(2000, Math.round(maxWaitMs)))
    : 400;
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), boundedMs);
  });
  return Promise.race([
    reverseGeocodePlace(latitude, longitude, locale),
    timeout,
  ]);
}
