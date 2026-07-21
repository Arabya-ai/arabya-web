import { describe, expect, it } from "vitest";
import { formatCountdown, getNextPrayer } from "@/lib/next-prayer";

const sample = {
  fajr: "04:30",
  sunrise: "06:00",
  dhuhr: "12:00",
  asr: "15:30",
  maghrib: "18:00",
  isha: "19:30",
};

describe("getNextPrayer", () => {
  it("picks the next prayer later today", () => {
    const now = new Date("2026-07-21T10:00:00+03:00");
    const next = getNextPrayer(sample, "Africa/Cairo", now);
    expect(next?.key).toBe("dhuhr");
    expect(next?.labelAr).toBe("الظهر");
  });

  it("rolls to fajr tomorrow after isha", () => {
    const now = new Date("2026-07-21T22:00:00+03:00");
    const next = getNextPrayer(sample, "Africa/Cairo", now);
    expect(next?.key).toBe("fajr");
  });
});

describe("formatCountdown", () => {
  it("formats remaining time with eastern numerals", () => {
    expect(formatCountdown(3661000)).toBe("٠١:٠١:٠١");
  });
});
