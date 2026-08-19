import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  stockKeyErrorForSource,
  syncMptStockKeysFromEnv,
} from "@/lib/mpt-stock-keys";

describe("syncMptStockKeysFromEnv", () => {
  it("writes Pexels keys for the Python engine", () => {
    const dir = mkdtempSync(join(tmpdir(), "mpt-keys-"));
    const filePath = join(dir, ".runtime-stock-keys.env");
    try {
      const result = syncMptStockKeysFromEnv(
        { PEXELS_API_KEY: "pex_test_one, pex_test_two" },
        filePath,
        [],
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
      expect(syncMptStockKeysFromEnv({}, filePath, [])).toEqual({
        pexels: 0,
        pixabay: 0,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads a Pexels key from .env.production.local when process env is empty", () => {
    const dir = mkdtempSync(join(tmpdir(), "mpt-keys-"));
    const envFile = join(dir, ".env.production.local");
    const filePath = join(dir, ".runtime-stock-keys.env");
    try {
      writeFileSync(envFile, 'PEXELS_API_KEY="pex_from_file"\n', "utf8");
      const result = syncMptStockKeysFromEnv({}, filePath, [envFile]);
      expect(result).toEqual({ pexels: 1, pixabay: 0 });
      expect(readFileSync(filePath, "utf8")).toContain(
        "PEXELS_API_KEY=pex_from_file",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags Pexels jobs when Next.js has no key", () => {
    expect(stockKeyErrorForSource("pexels", { pexels: 0, pixabay: 1 })).toBe(
      "missing_pexels_key",
    );
    expect(stockKeyErrorForSource("pexels", { pexels: 1, pixabay: 0 })).toBe(
      null,
    );
    expect(stockKeyErrorForSource("coverr", { pexels: 0, pixabay: 0 })).toBe(
      null,
    );
  });
});
