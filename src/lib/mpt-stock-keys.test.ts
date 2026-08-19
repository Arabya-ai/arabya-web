import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { syncMptStockKeysFromEnv } from "@/lib/mpt-stock-keys";

describe("syncMptStockKeysFromEnv", () => {
  it("writes Pexels keys for the Python engine", () => {
    const dir = mkdtempSync(join(tmpdir(), "mpt-keys-"));
    const filePath = join(dir, ".runtime-stock-keys.env");
    try {
      const result = syncMptStockKeysFromEnv(
        { PEXELS_API_KEY: "pex_test_one, pex_test_two" },
        filePath,
      );
      expect(result).toEqual({ pexels: 2, pixabay: 0 });
      const text = readFileSync(filePath, "utf8");
      expect(text).toContain("PEXELS_API_KEY=pex_test_one,pex_test_two");
      expect(text).not.toContain("PIXABAY");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips writing when no stock keys exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "mpt-keys-"));
    const filePath = join(dir, "missing.env");
    try {
      expect(syncMptStockKeysFromEnv({}, filePath)).toEqual({
        pexels: 0,
        pixabay: 0,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
