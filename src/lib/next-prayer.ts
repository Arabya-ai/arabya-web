import { toArabicNumerals } from "@/lib/format";

export type PrayerTimings = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export type NextPrayerInfo = {
  key: keyof PrayerTimings;
  labelAr: string;
  /** Instant of the next occurrence */
  atMs: number;
};

const PRAYER_ORDER: { key: keyof PrayerTimings; labelAr: string }[] = [
  { key: "fajr", labelAr: "الفجر" },
  { key: "dhuhr", labelAr: "الظهر" },
  { key: "asr", labelAr: "العصر" },
  { key: "maghrib", labelAr: "المغرب" },
  { key: "isha", labelAr: "العشاء" },
];

function parseHm(raw: string): { h: number; m: number } | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h > 23 || min > 59) {
    return null;
  }
  return { h, m: min };
}

/** Wall-clock YYYY-MM-DD in a given IANA timezone. */
function ymdInTimeZone(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
}

/**
 * Build a Date for HH:MM on a calendar day in `timeZone`.
 * Uses iterative correction against Intl so DST is handled.
 */
function zonedDateTime(
  ymd: string,
  h: number,
  m: number,
  timeZone: string,
): Date {
  let guess = new Date(`${ymd}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(guess);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asY = get("year");
    const asMo = get("month");
    const asD = get("day");
    const asH = get("hour");
    const asM = get("minute");
    const [ty, tm, td] = ymd.split("-").map(Number);
    const desired = Date.UTC(ty, tm - 1, td, h, m, 0);
    const actual = Date.UTC(asY, asMo - 1, asD, asH, asM, 0);
    guess = new Date(guess.getTime() + (desired - actual));
  }
  return guess;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function getNextPrayer(
  timings: PrayerTimings,
  timeZone: string | null | undefined,
  now = new Date(),
): NextPrayerInfo | null {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayYmd = ymdInTimeZone(now, tz);

  for (const row of PRAYER_ORDER) {
    const hm = parseHm(timings[row.key]);
    if (!hm) continue;
    const at = zonedDateTime(todayYmd, hm.h, hm.m, tz);
    if (at.getTime() > now.getTime() + 500) {
      return { key: row.key, labelAr: row.labelAr, atMs: at.getTime() };
    }
  }

  const fajr = parseHm(timings.fajr);
  if (!fajr) return null;
  const tomorrow = addDaysYmd(todayYmd, 1);
  const at = zonedDateTime(tomorrow, fajr.h, fajr.m, tz);
  return { key: "fajr", labelAr: "الفجر", atMs: at.getTime() };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => toArabicNumerals(String(n).padStart(2, "0"));
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
