import { NextResponse } from "next/server";
import { resolvePortalLocationFromSearch } from "@/lib/portal-cities";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reverseGeocodePlaceBounded } from "@/lib/reverse-geocode";
import { readPrayerDefaults } from "@/lib/prayer-defaults-store";

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

const GREGORIAN_MONTHS_EN: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

const HIJRI_MONTHS_EN: Record<number, string> = {
  1: "Muharram",
  2: "Safar",
  3: "Rabiʿ al-awwal",
  4: "Rabiʿ al-thani",
  5: "Jumada al-ula",
  6: "Jumada al-akhira",
  7: "Rajab",
  8: "Shaʿban",
  9: "Ramadan",
  10: "Shawwal",
  11: "Dhul-Qaʿdah",
  12: "Dhul-Hijjah",
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
  const limited = enforceRateLimit(req, { prefix: "prayer-times", limit: 30 });
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
  const defaults = readPrayerDefaults();
  const methodOverride = searchParams.get("method");
  const schoolOverride = searchParams.get("school");
  const method = methodOverride
    ? Math.min(25, Math.max(0, Math.round(Number(methodOverride) || defaults.method)))
    : defaults.method || cfg.method;
  const school =
    schoolOverride === "1" || schoolOverride === "0"
      ? Number(schoolOverride)
      : defaults.school;

  try {
    const url = new URL("https://api.aladhan.com/v1/timings");
    url.searchParams.set("latitude", String(cfg.latitude));
    url.searchParams.set("longitude", String(cfg.longitude));
    url.searchParams.set("method", String(method));
    url.searchParams.set("school", String(school));

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
        meta?: { timezone?: string };
        date?: {
          readable?: string;
          hijri?: {
            day?: string;
            month?: { ar?: string; en?: string; number?: number };
            year?: string;
            weekday?: { ar?: string; en?: string };
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

    const gDayAr = greg?.day ? toArabicDigits(greg.day) : null;
    const gMonthAr =
      greg?.month?.number != null
        ? GREGORIAN_MONTHS_AR[greg.month.number] ?? greg.month.en
        : null;
    const gYearAr = greg?.year ? toArabicDigits(greg.year) : null;
    const gregorianAr =
      gDayAr && gMonthAr && gYearAr
        ? `${gDayAr} ${gMonthAr} ${gYearAr}`
        : null;

    const gMonthEn =
      greg?.month?.number != null
        ? GREGORIAN_MONTHS_EN[greg.month.number] ?? greg.month.en
        : greg?.month?.en ?? null;
    const gregorianEn =
      greg?.day && gMonthEn && greg?.year
        ? `${greg.day} ${gMonthEn} ${greg.year}`
        : payload.data?.date?.readable ?? null;

    const hDayAr = hijri?.day ? toArabicDigits(hijri.day) : null;
    const hYearAr = hijri?.year ? toArabicDigits(hijri.year) : null;
    const hijriAr = [hijri?.weekday?.ar, hDayAr, hijri?.month?.ar, hYearAr]
      .filter(Boolean)
      .join(" ");
    const hijriEnParts = [
      greg?.weekday?.en,
      hijri?.day,
      hijri?.month?.number != null
        ? HIJRI_MONTHS_EN[hijri.month.number] ?? hijri.month.en
        : hijri?.month?.en,
      hijri?.year,
    ].filter(Boolean);
    const hijriEn = hijriEnParts.length ? hijriEnParts.join(" ") : null;

    const place = await reverseGeocodePlaceBounded(
      cfg.latitude,
      cfg.longitude,
      locale,
      450,
    );

    return NextResponse.json(
      {
        city: cfg.id,
        method,
        school,
        timezone: payload.data?.meta?.timezone ?? null,
        source: "api.aladhan.com",
        ...(cfg.approxCity ? { approxCity: cfg.approxCity } : {}),
        ...(place ? { place } : {}),
        gregorian: {
          readable: payload.data?.date?.readable ?? null,
          ar: gregorianAr,
          en: gregorianEn,
          day: greg?.day ?? null,
          month: greg?.month?.number ?? null,
          year: greg?.year ?? null,
        },
        hijri: hijri
          ? {
              day: hijri.day,
              month: hijri.month?.number ?? null,
              monthAr: hijri.month?.ar,
              monthEn:
                hijri.month?.number != null
                  ? HIJRI_MONTHS_EN[hijri.month.number] ??
                    hijri.month?.en ??
                    null
                  : (hijri.month?.en ?? null),
              year: hijri.year,
              weekdayAr: hijri.weekday?.ar,
              weekdayEn: hijri.weekday?.en ?? null,
              ar: hijriAr || null,
              en: hijriEn || null,
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
