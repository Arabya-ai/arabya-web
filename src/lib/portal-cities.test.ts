import { describe, expect, it } from "vitest";
import {
  parsePortalCoords,
  resolvePortalCity,
  resolvePortalLocationFromSearch,
} from "./portal-cities";

describe("resolvePortalCity", () => {
  it("defaults to cairo when empty", () => {
    expect(resolvePortalCity(null)?.id).toBe("cairo");
    expect(resolvePortalCity("")?.id).toBe("cairo");
  });

  it("returns null for unknown city (no silent cairo)", () => {
    expect(resolvePortalCity("not-a-city")).toBeNull();
    expect(resolvePortalCity("paris")).toBeNull();
  });

  it("resolves allowlisted cities", () => {
    expect(resolvePortalCity("Riyadh")?.id).toBe("riyadh");
  });
});

describe("parsePortalCoords", () => {
  it("rejects out-of-range and non-numeric", () => {
    expect(parsePortalCoords("999", "999")).toBeNull();
    expect(parsePortalCoords("x", "y")).toBeNull();
    expect(parsePortalCoords("91", "0")).toBeNull();
  });

  it("accepts valid WGS84", () => {
    expect(parsePortalCoords("30.0444", "31.2357")).toEqual({
      latitude: 30.0444,
      longitude: 31.2357,
    });
  });
});

describe("resolvePortalLocationFromSearch", () => {
  it("rejects invalid city", () => {
    const sp = new URLSearchParams({ city: "tokyo" });
    expect(resolvePortalLocationFromSearch(sp)).toEqual({
      ok: false,
      code: "invalid_city",
    });
  });

  it("rejects invalid lat/lon", () => {
    const sp = new URLSearchParams({ lat: "999", lon: "999" });
    expect(resolvePortalLocationFromSearch(sp)).toEqual({
      ok: false,
      code: "invalid_coordinates",
    });
  });

  it("accepts valid city", () => {
    const sp = new URLSearchParams({ city: "makkah" });
    const r = resolvePortalLocationFromSearch(sp);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cfg.id).toBe("makkah");
  });

  it("accepts latitude/longitude aliases (no silent Cairo)", () => {
    const sp = new URLSearchParams({
      latitude: "24.7136",
      longitude: "46.6753",
    });
    const r = resolvePortalLocationFromSearch(sp);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cfg.latitude).toBeCloseTo(24.7136);
      expect(r.cfg.longitude).toBeCloseTo(46.6753);
      expect(r.cfg.approxCity).toBe("riyadh");
    }
  });

  it("accepts lng as longitude alias", () => {
    const sp = new URLSearchParams({ lat: "21.3891", lng: "39.8579" });
    const r = resolvePortalLocationFromSearch(sp);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cfg.approxCity).toBe("makkah");
    }
  });

  it("prefers short lat/lon when both forms are present", () => {
    const sp = new URLSearchParams({
      lat: "21.3891",
      lon: "39.8579",
      latitude: "30.0444",
      longitude: "31.2357",
    });
    const r = resolvePortalLocationFromSearch(sp);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cfg.approxCity).toBe("makkah");
    }
  });
});
