import { afterEach, describe, expect, it } from "vitest";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";
import { STORAGE_KEYS } from "@/lib/storage-keys";

describe("isCloudSyncConfigured", () => {
  const keys = [
    "ARABYA_SYNC_URL",
    "ARABYA_SYNC_SECRET",
    "ARABYA_D1_ENABLED",
  ] as const;
  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  });

  function snapshotEnv() {
    for (const key of keys) prev[key] = process.env[key];
  }

  it("is false when env is incomplete", () => {
    snapshotEnv();
    delete process.env.ARABYA_SYNC_URL;
    delete process.env.ARABYA_SYNC_SECRET;
    delete process.env.ARABYA_D1_ENABLED;
    expect(isCloudSyncConfigured()).toBe(false);
  });

  it("is true only when URL, secret, and D1 flag are set", () => {
    snapshotEnv();
    process.env.ARABYA_SYNC_URL = "https://sync.example.com";
    process.env.ARABYA_SYNC_SECRET = "secret";
    process.env.ARABYA_D1_ENABLED = "1";
    expect(isCloudSyncConfigured()).toBe(true);
  });
});

describe("cloud sync storage keys stay aligned", () => {
  it("uses the shared data-rev key", () => {
    expect(STORAGE_KEYS.dataRev).toBe("arabya-data-rev");
    expect(STORAGE_KEYS.ayahNotes).toBe("arabya-ayah-notes");
  });
});
