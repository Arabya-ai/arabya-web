import { describe, expect, it } from "vitest";
import {
  ARABYA_SERVICES,
  ARABYA_SERVICE_CATEGORIES,
  servicesByCategory,
} from "@/lib/arabya-services-catalog";

describe("arabya-services-catalog", () => {
  it("lists unique service ids and hrefs", () => {
    const ids = ARABYA_SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ARABYA_SERVICES.length).toBeGreaterThanOrEqual(16);
    for (const s of ARABYA_SERVICES) {
      expect(s.href.startsWith("/")).toBe(true);
    }
  });

  it("covers every category", () => {
    for (const cat of ARABYA_SERVICE_CATEGORIES) {
      expect(servicesByCategory(cat).length).toBeGreaterThan(0);
    }
  });
});
