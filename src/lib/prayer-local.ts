/**
 * Offline prayer times + qibla via batoulapps/adhan (MIT).
 * Used as primary when Aladhan is unreachable, or when prefer=local.
 */

import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  Qibla,
  type CalculationParameters,
} from "adhan";

export type LocalPrayerTimings = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type LocalPrayerBundle = {
  source: "adhan-js";
  timezone: string;
  method: number;
  school: 0 | 1;
  timings: LocalPrayerTimings;
  gregorian: {
    readable: string;
    ar: string | null;
    en: string | null;
    day: string;
    month: number;
    year: string;
  };
  hijri: {
    day: string;
    month: number | null;
    monthAr: string | null;
    monthEn: string | null;
    year: string;
    weekdayAr: string | null;
    weekdayEn: string | null;
    ar: string | null;
    en: string | null;
  };
};

const CITY_TZ: Record<string, string> = {
  cairo: "Africa/Cairo",
  riyadh: "Asia/Riyadh",
  makkah: "Asia/Riyadh",
  madinah: "Asia/Riyadh",
  jeddah: "Asia/Riyadh",
  amman: "Asia/Amman",
};

/** Map Aladhan method ids → adhan-js calculation presets. */
export function calculationParamsForMethod(
  method: number,
  school: 0 | 1,
): CalculationParameters {
  let params: CalculationParameters;
  switch (method) {
    case 1:
      params = CalculationMethod.Karachi();
      break;
    case 2:
      params = CalculationMethod.NorthAmerica();
      break;
    case 3:
      params = CalculationMethod.MuslimWorldLeague();
      break;
    case 4:
      params = CalculationMethod.UmmAlQura();
      break;
    case 5:
      params = CalculationMethod.Egyptian();
      break;
    case 7:
      params = CalculationMethod.Tehran();
      break;
    case 8:
      // Gulf-ish: use Qatar-like (UmmAlQura is close); adhan has no Gulf preset
      params = CalculationMethod.UmmAlQura();
      break;
    default:
      params = CalculationMethod.MuslimWorldLeague();
      break;
  }
  params.madhab = school === 1 ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function resolvePrayerTimeZone(
  cityId: string | null | undefined,
  latitude: number,
  longitude: number,
): string {
  if (cityId && CITY_TZ[cityId]) return CITY_TZ[cityId];
  // Nearest curated city by crude lat/lon (enough for TZ pick)
  let best = "cairo";
  let bestDist = Infinity;
  for (const [id, tz] of Object.entries(CITY_TZ)) {
    void tz;
    const anchors: Record<string, [number, number]> = {
      cairo: [30.0444, 31.2357],
      riyadh: [24.7136, 46.6753],
      makkah: [21.3891, 39.8579],
      madinah: [24.5247, 39.5692],
      jeddah: [21.4858, 39.1925],
      amman: [31.9539, 35.9106],
    };
    const [la, lo] = anchors[id]!;
    const d = (latitude - la) ** 2 + (longitude - lo) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return CITY_TZ[best] ?? "UTC";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatHmInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  // en-GB can yield 24 for midnight in some engines — normalize
  const h = hour === "24" ? "00" : hour;
  return `${h}:${minute}`;
}

function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);
}

const GREGORIAN_MONTHS_AR = [
  "",
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const GREGORIAN_MONTHS_EN = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function calendarParts(
  date: Date,
  timeZone: string,
  calendar: "gregory" | "islamic-umalqura" | "islamic",
  locale: string,
) {
  try {
    return new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }).formatToParts(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }).formatToParts(date);
  }
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string | null {
  return parts.find((p) => p.type === type)?.value ?? null;
}

export function computeLocalPrayerTimes(opts: {
  latitude: number;
  longitude: number;
  method: number;
  school: 0 | 1;
  cityId?: string | null;
  now?: Date;
}): LocalPrayerBundle {
  const now = opts.now ?? new Date();
  const timeZone = resolvePrayerTimeZone(
    opts.cityId,
    opts.latitude,
    opts.longitude,
  );
  const coords = new Coordinates(opts.latitude, opts.longitude);
  const params = calculationParamsForMethod(opts.method, opts.school);
  const pt = new PrayerTimes(coords, now, params);

  const timings: LocalPrayerTimings = {
    fajr: formatHmInTimeZone(pt.fajr, timeZone),
    sunrise: formatHmInTimeZone(pt.sunrise, timeZone),
    dhuhr: formatHmInTimeZone(pt.dhuhr, timeZone),
    asr: formatHmInTimeZone(pt.asr, timeZone),
    maghrib: formatHmInTimeZone(pt.maghrib, timeZone),
    isha: formatHmInTimeZone(pt.isha, timeZone),
  };

  const gPartsEn = calendarParts(now, timeZone, "gregory", "en");
  const gDay = part(gPartsEn, "day") ?? "";
  const gMonthName = part(gPartsEn, "month") ?? "";
  const gYear = part(gPartsEn, "year") ?? "";
  const gMonthNum = (() => {
    const raw = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "numeric",
    }).format(now);
    return Math.min(12, Math.max(1, Number(raw) || 1));
  })();

  const gregorianEn = `${gDay} ${GREGORIAN_MONTHS_EN[gMonthNum] ?? gMonthName} ${gYear}`;
  const gregorianAr = `${toArabicDigits(gDay)} ${GREGORIAN_MONTHS_AR[gMonthNum] ?? gMonthName} ${toArabicDigits(gYear)}`;

  const hPartsAr = calendarParts(now, timeZone, "islamic-umalqura", "ar");
  const hPartsEn = calendarParts(now, timeZone, "islamic-umalqura", "en");
  const hDay = part(hPartsEn, "day") ?? part(hPartsAr, "day") ?? "";
  const hMonthAr = part(hPartsAr, "month");
  const hMonthEn = part(hPartsEn, "month");
  const hYear = part(hPartsEn, "year") ?? part(hPartsAr, "year") ?? "";
  const hWeekdayAr = part(hPartsAr, "weekday");
  const hWeekdayEn = part(hPartsEn, "weekday");

  return {
    source: "adhan-js",
    timezone: timeZone,
    method: opts.method,
    school: opts.school,
    timings,
    gregorian: {
      readable: gregorianEn,
      ar: gregorianAr,
      en: gregorianEn,
      day: gDay,
      month: gMonthNum,
      year: gYear,
    },
    hijri: {
      day: hDay,
      month: null,
      monthAr: hMonthAr,
      monthEn: hMonthEn,
      year: hYear,
      weekdayAr: hWeekdayAr,
      weekdayEn: hWeekdayEn,
      ar: [hWeekdayAr, toArabicDigits(hDay), hMonthAr, toArabicDigits(hYear)]
        .filter(Boolean)
        .join(" "),
      en: [hWeekdayEn, hDay, hMonthEn, hYear].filter(Boolean).join(" "),
    },
  };
}

export function computeLocalQiblaDirection(
  latitude: number,
  longitude: number,
): number {
  const direction = Qibla(new Coordinates(latitude, longitude));
  return ((direction % 360) + 360) % 360;
}

export function formatDirectionLabel(
  direction: number,
  locale: "ar" | "en",
): string {
  const rounded = Math.round(direction);
  return locale === "en"
    ? `${rounded}° from north`
    : `${rounded}° من الشمال`;
}

/** @internal test helper */
export function _pad2(n: number): string {
  return pad2(n);
}
