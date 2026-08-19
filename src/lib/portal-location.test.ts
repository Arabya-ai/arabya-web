import { describe, expect, it } from "vitest";
import {
  parsePortalCoords,
  portalLocationSearchParams,
} from "@/lib/portal-location";

describe("parsePortalCoords", () => {
  it("accepts valid decimal coordinates", () => {
    expect(parsePortalCoords("21.4225", "39.8262")).toEqual({
      lat: 21.4225,
      lon: 39.8262,
    });
  });

  it("rejects empty, non-numeric, and out-of-range values", () => {
    expect(parsePortalCoords("", "39")).toBeNull();
    expect(parsePortalCoords("abc", "39")).toBeNull();
    expect(parsePortalCoords("91", "0")).toBeNull();
    expect(parsePortalCoords("0", "181")).toBeNull();
  });
});

describe("portalLocationSearchParams", () => {
  it("builds city query params with locale", () => {
    const params = portalLocationSearchParams(
      { mode: "city", cityId: "makkah" },
      "en",
    );
    expect(params.get("city")).toBe("makkah");
    expect(params.get("lang")).toBe("en");
    expect(params.get("lat")).toBeNull();
  });

  it("builds coordinate query params with locale", () => {
    const params = portalLocationSearchParams(
      { mode: "coords", lat: 24.7, lon: 46.7 },
      "ar",
    );
    expect(params.get("lat")).toBe("24.7");
    expect(params.get("lon")).toBe("46.7");
    expect(params.get("lang")).toBe("ar");
    expect(params.get("city")).toBeNull();
  });
});
