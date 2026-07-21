import { NextResponse } from "next/server";
import { resolvePortalCity } from "@/lib/portal-cities";

/** Qibla bearing from city coordinates via Aladhan (free, no key). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cfg = resolvePortalCity(searchParams.get("city"));

  try {
    const url = `https://api.aladhan.com/v1/qibla/${cfg.latitude}/${cfg.longitude}`;
    const res = await fetch(url, {
      next: { revalidate: 86400 * 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream", status: res.status },
        { status: 502 },
      );
    }
    const payload = (await res.json()) as {
      data?: { direction?: number; latitude?: number; longitude?: number };
    };
    const direction = payload.data?.direction;
    if (typeof direction !== "number" || !Number.isFinite(direction)) {
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }

    const normalized = ((direction % 360) + 360) % 360;

    return NextResponse.json(
      {
        city: cfg.id,
        cityLabel: cfg.label,
        source: "api.aladhan.com",
        latitude: cfg.latitude,
        longitude: cfg.longitude,
        direction: Math.round(normalized * 10) / 10,
        directionLabel: `${Math.round(normalized)}° من الشمال`,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=2592000, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
