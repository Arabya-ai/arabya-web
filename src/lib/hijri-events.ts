import { readFile } from "node:fs/promises";
import path from "node:path";

const dataRoot = path.join(process.cwd(), "data", "ibadah");

export type HijriEvent = {
  id: string;
  month: number;
  day: number;
  titleAr: string;
  titleEn: string;
  kind: string;
};

export type HijriMonthName = { ar: string; en: string };

export const HIJRI_MONTHS: HijriMonthName[] = [
  { ar: "محرّم", en: "Muharram" },
  { ar: "صفر", en: "Safar" },
  { ar: "ربيع الأول", en: "Rabiʿ I" },
  { ar: "ربيع الآخر", en: "Rabiʿ II" },
  { ar: "جمادى الأولى", en: "Jumada I" },
  { ar: "جمادى الآخرة", en: "Jumada II" },
  { ar: "رجب", en: "Rajab" },
  { ar: "شعبان", en: "Shaʿban" },
  { ar: "رمضان", en: "Ramadan" },
  { ar: "شوّال", en: "Shawwal" },
  { ar: "ذو القعدة", en: "Dhu al-Qaʿdah" },
  { ar: "ذو الحجة", en: "Dhu al-Hijjah" },
];

export async function listHijriEvents(): Promise<HijriEvent[]> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "hijri-events.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { events?: HijriEvent[] };
    return (parsed.events ?? []).filter(
      (e) =>
        e.id &&
        e.month >= 1 &&
        e.month <= 12 &&
        e.day >= 1 &&
        e.day <= 30,
    );
  } catch {
    return [];
  }
}

/** Approximate upcoming events in the Islamic year (fixed month/day). */
export function upcomingHijriEvents(
  events: HijriEvent[],
  hijriMonth: number,
  hijriDay: number,
  limit = 5,
): HijriEvent[] {
  const scored = events.map((e) => {
    let delta = (e.month - hijriMonth) * 30 + (e.day - hijriDay);
    if (delta < 0) delta += 12 * 30;
    return { e, delta };
  });
  scored.sort((a, b) => a.delta - b.delta);
  return scored.slice(0, limit).map((s) => s.e);
}

export function formatHijriEventDate(
  event: HijriEvent,
  locale: string,
): string {
  const month = HIJRI_MONTHS[event.month - 1];
  const name = locale === "en" ? month?.en : month?.ar;
  return locale === "en"
    ? `${event.day} ${name}`
    : `${event.day} ${name}`;
}
