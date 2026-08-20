import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function flatten(
  value: unknown,
  prefix = "",
  out: string[] = [],
): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      flatten(nested, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.push(prefix);
  return out;
}

const namespaces = [
  "Auth",
  "Account",
  "Tahfeez",
  "Dash",
  "Admin",
  "Terms",
  "Adhkar",
  "Qibla",
  "Hadith",
  "Heritage",
  "IbadahEvents",
  "Search",
  "Nav",
] as const;

describe("account/CRM i18n parity", () => {
  const ar = JSON.parse(
    readFileSync(join(process.cwd(), "messages/ar.json"), "utf8"),
  ) as Record<string, unknown>;
  const en = JSON.parse(
    readFileSync(join(process.cwd(), "messages/en.json"), "utf8"),
  ) as Record<string, unknown>;

  for (const ns of namespaces) {
    it(`keeps ${ns} keys aligned between ar and en`, () => {
      const arKeys = flatten(ar[ns]).sort();
      const enKeys = flatten(en[ns]).sort();
      expect(arKeys).toEqual(enKeys);
    });
  }
});
