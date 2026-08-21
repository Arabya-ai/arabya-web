import { NextResponse } from "next/server";
import { resolvePortalLocationFromSearch } from "@/lib/portal-cities";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reverseGeocodePlaceBounded } from "@/lib/reverse-geocode";
import {
  computeLocalQiblaDirection,
  formatDirectionLabel,
} from "@/lib/prayer-local";

async function fetchAladhanQibla(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  const url = `https://api.aladhan.com/v1/qibla/${latitude}/${longitude}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      data?: { direction?: number };
    };
    const direction = payload.data?.direction;
    if (typeof direction !== "number" || !Number.isFinite(direction)) {
      return null;
    }
    return ((direction % 360) + 360) % 360;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Qibla bearing — Aladhan when reachable, else local adhan-js. */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "qibla", limit: 30 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const resolved = resolvePortalLocationFromSearch(searchParams);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.code, code: resolved.code },
      { status: 400 },
    );
  }
  const cfg = resolved.cfg;
  const langRaw = searchParams.get("lang");
  const locale = langRaw === "en" ? "en" : "ar";
  const preferLocal =
    searchParams.get("prefer") === "local" ||
    searchParams.get("source") === "local";

  const place = await reverseGeocodePlaceBounded(
    cfg.latitude,
    cfg.longitude,
    locale,
    450,
  );

  let direction: number;
  let source: "api.aladhan.com" | "adhan-js";

  if (preferLocal) {
    direction = computeLocalQiblaDirection(cfg.latitude, cfg.longitude);
    source = "adhan-js";
  } else {
    const remote = await fetchAladhanQibla(cfg.latitude, cfg.longitude);
    if (remote != null) {
      direction = remote;
      source = "api.aladhan.com";
    } else {
      direction = computeLocalQiblaDirection(cfg.latitude, cfg.longitude);
      source = "adhan-js";
    }
  }

  const directionRounded = Math.round(direction);
  const directionLabel = formatDirectionLabel(direction, locale);

  return NextResponse.json(
    {
      city: cfg.id,
      source,
      offline: source === "adhan-js",
      latitude: cfg.latitude,
      longitude: cfg.longitude,
      direction: Math.round(direction * 10) / 10,
      directionLabel,
      ...(cfg.approxCity ? { approxCity: cfg.approxCity } : {}),
      ...(place ? { place } : {}),
    },
    {
      headers: {
        "Cache-Control":
          source === "adhan-js"
            ? "public, s-maxage=3600, stale-while-revalidate=3600"
            : "public, s-maxage=2592000, stale-while-revalidate=86400",
      },
    },
  );
}
