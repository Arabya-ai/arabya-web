import { NextResponse } from "next/server";
import { resolvePortalCity } from "@/lib/portal-cities";

const GREGORIAN_MONTHS_AR: Record<number, string> = {
  1: "يناير",
  2: "فبراير",
  3: "مارس",
  4: "أبريل",
  5: "مايو",
  6: "يونيو",
  7: "يوليو",
  8: "أغسطس",
  9: "سبتمبر",
  10: "أكتوبر",
  11: "نوفمبر",
  12: "ديسمبر",
};

function stripTimezoneSuffix(t: string): string {
  return t.replace(/\s*\(.*\)$/, "").trim();
}

function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) =>
    "٠١٢٣٤٥٦٧٨٩"[Number(d)]!,
  );
}

/**
 * Prayer times + Hijri/Gregorian dates via Aladhan (free, no key).
 * Proxied server-side so the browser only talks to our origin.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cfg = resolvePortalCity(searchParams.get("city"));

  try {
    const url = new URL("https://api.aladhan.com/v1/timings");
    url.searchParams.set("latitude", String(cfg.latitude));
    url.searchParams.set("longitude", String(cfg.longitude));
    url.searchParams.set("method", String(cfg.method));

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "upstream", status: res.status },
        { status: 502 },
      );
    }
    const payload = (await res.json()) as {
      data?: {
        timings?: Record<string, string>;
        date?: {
          readable?: string;
          hijri?: {
            day?: string;
            month?: { ar?: string; number?: number };
            year?: string;
            weekday?: { ar?: string };
          };
          gregorian?: {
            day?: string;
            month?: { number?: number; en?: string };
            year?: string;
            weekday?: { en?: string };
            date?: string;
          };
        };
      };
    };
    const timings = payload.data?.timings;
    const hijri = payload.data?.date?.hijri;
    const greg = payload.data?.date?.gregorian;
    if (!timings) {
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }

    const gDay = greg?.day ? toArabicDigits(greg.day) : null;
    const gMonth =
      greg?.month?.number != null
        ? GREGORIAN_MONTHS_AR[greg.month.number] ?? greg.month.en
        : null;
    const gYear = greg?.year ? toArabicDigits(greg.year) : null;
    const gregorianAr =
      gDay && gMonth && gYear ? `${gDay} ${gMonth} ${gYear}` : null;

    const hDay = hijri?.day ? toArabicDigits(hijri.day) : null;
    const hYear = hijri?.year ? toArabicDigits(hijri.year) : null;
    const hijriAr = [hijri?.weekday?.ar, hDay, hijri?.month?.ar, hYear]
      .filter(Boolean)
      .join(" ");

    return NextResponse.json(
      {
        city: cfg.id,
        cityLabel: cfg.label,
        source: "api.aladhan.com",
        gregorian: {
          readable: payload.data?.date?.readable ?? null,
          ar: gregorianAr,
          day: greg?.day ?? null,
          month: greg?.month?.number ?? null,
          year: greg?.year ?? null,
        },
        hijri: hijri
          ? {
              day: hijri.day,
              monthAr: hijri.month?.ar,
              year: hijri.year,
              weekdayAr: hijri.weekday?.ar,
              ar: hijriAr || null,
            }
          : null,
        timings: {
          fajr: stripTimezoneSuffix(timings.Fajr ?? ""),
          sunrise: stripTimezoneSuffix(timings.Sunrise ?? ""),
          dhuhr: stripTimezoneSuffix(timings.Dhuhr ?? ""),
          asr: stripTimezoneSuffix(timings.Asr ?? ""),
          maghrib: stripTimezoneSuffix(timings.Maghrib ?? ""),
          isha: stripTimezoneSuffix(timings.Isha ?? ""),
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
