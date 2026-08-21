import { NextResponse } from "next/server";
import { resolvePortalLocationFromSearch } from "@/lib/portal-cities";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reverseGeocodePlaceBounded } from "@/lib/reverse-geocode";
import { readPrayerDefaults } from "@/lib/prayer-defaults-store";
import { computeLocalPrayerTimes } from "@/lib/prayer-local";

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

async function fetchAladhanTimings(
  latitude: number,
  longitude: number,
  method: number,
  school: number,
): Promise<{
  timings: Record<string, string>;
  timezone: string | null;
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
  readable?: string;
} | null> {
  const url = new URL("https://api.aladhan.com/v1/timings");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("method", String(method));
  url.searchParams.set("school", String(school));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2800);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
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
    if (!timings) return null;
    return {
      timings,
      timezone: payload.data?.meta?.timezone ?? null,
      hijri: payload.data?.date?.hijri,
      gregorian: payload.data?.date?.gregorian,
      readable: payload.data?.date?.readable,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prayer times + Hijri/Gregorian dates.
 * Prefers Aladhan when reachable; always falls back to local adhan-js on Contabo.
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
  const preferLocal =
    searchParams.get("prefer") === "local" ||
    searchParams.get("source") === "local";
  const defaults = readPrayerDefaults();
  const methodOverride = searchParams.get("method");
  const schoolOverride = searchParams.get("school");
  const method = methodOverride
    ? Math.min(25, Math.max(0, Math.round(Number(methodOverride) || defaults.method)))
    : defaults.method || cfg.method;
  const school = (
    schoolOverride === "1" || schoolOverride === "0"
      ? Number(schoolOverride)
      : defaults.school
  ) as 0 | 1;

  const place = await reverseGeocodePlaceBounded(
    cfg.latitude,
    cfg.longitude,
    locale,
    450,
  );

  const local = computeLocalPrayerTimes({
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    method,
    school,
    cityId: cfg.id,
  });

  if (!preferLocal) {
    const remote = await fetchAladhanTimings(
      cfg.latitude,
      cfg.longitude,
      method,
      school,
    );
    if (remote?.timings) {
      const timings = remote.timings;
      const hijri = remote.hijri;
      const greg = remote.gregorian;

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
          : remote.readable ?? null;

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

      return NextResponse.json(
        {
          city: cfg.id,
          method,
          school,
          timezone: remote.timezone ?? local.timezone,
          source: "api.aladhan.com",
          fallbackAvailable: true,
          ...(cfg.approxCity ? { approxCity: cfg.approxCity } : {}),
          ...(place ? { place } : {}),
          gregorian: {
            readable: remote.readable ?? null,
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
    }
  }

  return NextResponse.json(
    {
      city: cfg.id,
      method,
      school,
      timezone: local.timezone,
      source: "adhan-js",
      offline: true,
      ...(cfg.approxCity ? { approxCity: cfg.approxCity } : {}),
      ...(place ? { place } : {}),
      gregorian: local.gregorian,
      hijri: local.hijri,
      timings: local.timings,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
      },
    },
  );
}
