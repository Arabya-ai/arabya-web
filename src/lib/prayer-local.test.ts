import { describe, expect, it } from "vitest";
import {
  calculationParamsForMethod,
  computeLocalPrayerTimes,
  computeLocalQiblaDirection,
  formatHmInTimeZone,
  resolvePrayerTimeZone,
} from "@/lib/prayer-local";

describe("prayer-local", () => {
  it("resolves Cairo timezone", () => {
    expect(resolvePrayerTimeZone("cairo", 30, 31)).toBe("Africa/Cairo");
    expect(resolvePrayerTimeZone(null, 24.7, 46.7)).toBe("Asia/Riyadh");
  });

  it("maps Egyptian method and returns HH:MM timings", () => {
    const bundle = computeLocalPrayerTimes({
      latitude: 30.0444,
      longitude: 31.2357,
      method: 5,
      school: 0,
      cityId: "cairo",
      now: new Date("2026-06-15T12:00:00Z"),
    });
    expect(bundle.source).toBe("adhan-js");
    expect(bundle.timezone).toBe("Africa/Cairo");
    for (const key of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const) {
      expect(bundle.timings[key]).toMatch(/^\d{2}:\d{2}$/);
    }
    // Fajr should be before sunrise, maghrib after asr
    expect(bundle.timings.fajr < bundle.timings.sunrise).toBe(true);
    expect(bundle.timings.maghrib > bundle.timings.asr).toBe(true);
  });

  it("computes qibla for Cairo roughly SE", () => {
    const d = computeLocalQiblaDirection(30.0444, 31.2357);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(160);
  });

  it("builds calculation params for schools", () => {
    const shafi = calculationParamsForMethod(5, 0);
    const hanafi = calculationParamsForMethod(5, 1);
    expect(shafi.madhab).not.toEqual(hanafi.madhab);
  });

  it("formats hours in a timezone", () => {
    const d = new Date("2026-06-15T12:00:00Z");
    const cairo = formatHmInTimeZone(d, "Africa/Cairo");
    expect(cairo).toMatch(/^\d{2}:\d{2}$/);
  });
});
