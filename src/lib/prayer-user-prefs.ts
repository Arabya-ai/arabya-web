/** Per-browser prayer calculation overrides (Phase E — Qibla expansion). */

const KEY = "arabya_prayer_user_v1";

export type PrayerUserPrefs = {
  method: number;
  school: 0 | 1;
};

export const PRAYER_METHOD_OPTIONS: Array<{
  id: number;
  labelAr: string;
  labelEn: string;
}> = [
  { id: 5, labelAr: "مصر (هيئة المساحة)", labelEn: "Egyptian General Authority" },
  { id: 2, labelAr: "ISNA (أمريكا)", labelEn: "ISNA" },
  { id: 3, labelAr: "مكة (أم القرى)", labelEn: "Makkah (Umm al-Qura)" },
  { id: 4, labelAr: "كارachi", labelEn: "Karachi" },
  { id: 1, labelAr: "جامعة العلوم الإسلامية، كarachi", labelEn: "University of Islamic Sciences" },
  { id: 7, labelAr: "Tehran", labelEn: "Tehran" },
  { id: 8, labelAr: "Gulf", labelEn: "Gulf Region" },
];

const DEFAULT: PrayerUserPrefs = { method: 5, school: 0 };

function sanitizeMethod(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT.method;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > 25) return DEFAULT.method;
  return rounded;
}

export function readPrayerUserPrefs(): PrayerUserPrefs {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<PrayerUserPrefs>;
    return {
      method: sanitizeMethod(parsed.method),
      school: Number(parsed.school) === 1 ? 1 : 0,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writePrayerUserPrefs(prefs: PrayerUserPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      method: sanitizeMethod(prefs.method),
      school: prefs.school === 1 ? 1 : 0,
    }),
  );
  window.dispatchEvent(new Event("arabya-prayer-prefs-updated"));
}

export function appendPrayerUserParams(params: URLSearchParams): URLSearchParams {
  const prefs = readPrayerUserPrefs();
  params.set("method", String(prefs.method));
  params.set("school", String(prefs.school));
  return params;
}
