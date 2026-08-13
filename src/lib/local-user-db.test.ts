import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getUserDb,
  localAdminStats,
  localPullSync,
  localPushSync,
  resetUserDbForTests,
} from "@/lib/local-user-db";

describe("local-user-db sync", () => {
  let tmpDir: string;
  const prevPath = process.env.ARABYA_USER_DB_PATH;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arabya-user-db-"));
    process.env.ARABYA_USER_DB_PATH = path.join(tmpDir, "test.sqlite");
    resetUserDbForTests();
  });

  afterEach(() => {
    resetUserDbForTests({ deleteFile: true });
    if (prevPath === undefined) delete process.env.ARABYA_USER_DB_PATH;
    else process.env.ARABYA_USER_DB_PATH = prevPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates schema and round-trips bookmarks and notes", () => {
    getUserDb();
    const user = {
      email: "reader@example.com",
      name: "Reader",
      image: null,
    };

    const pushed = localPushSync(user, {
      bookmarks: [
        {
          key: "1:1",
          surahId: 1,
          verse: 1,
          page: 1,
          savedAt: 1_700_000_000_000,
        },
      ],
      notes: [
        {
          key: "1:1",
          surahId: 1,
          verse: 1,
          text: "ملاحظة تجريبية",
          updatedAt: 1_700_000_000_001,
        },
      ],
      study: [],
      progress: { lastPage: 2, habit: { streak: 1 }, updatedAt: null },
    });

    expect(pushed.bookmarks).toHaveLength(1);
    expect(pushed.notes[0]?.text).toBe("ملاحظة تجريبية");
    expect(pushed.progress.lastPage).toBe(2);

    const pulled = localPullSync(user);
    expect(pulled.bookmarks[0]?.key).toBe("1:1");
    expect(pulled.notes[0]?.text).toBe("ملاحظة تجريبية");
    expect(pulled.userId).toBe("reader@example.com");
  });

  it("simulates two devices: device A push → device B pull", () => {
    getUserDb();
    const email = "two-device@example.com";
    const deviceA = { email, name: "Device A", image: null };
    const deviceB = { email, name: "Device B", image: null };

    localPushSync(deviceA, {
      bookmarks: [
        {
          key: "2:255",
          surahId: 2,
          verse: 255,
          page: 42,
          savedAt: 1_800_000_000_000,
        },
        {
          key: "1:1",
          surahId: 1,
          verse: 1,
          page: 1,
          savedAt: 1_800_000_000_100,
        },
      ],
      notes: [
        {
          key: "2:255",
          surahId: 2,
          verse: 255,
          text: "آية الكرسي من الجهاز أ",
          updatedAt: 1_800_000_000_200,
        },
      ],
      study: [
        {
          id: "study_a1",
          kind: "ayah",
          title: "آية الكرسي",
          surahId: 2,
          verse: 255,
          notes: "دراسة",
          updatedAt: 1_800_000_000_300,
          createdAt: 1_800_000_000_300,
        },
      ],
      progress: {
        lastPage: 42,
        habit: { streak: 3, goal: 2 },
        updatedAt: 1_800_000_000_400,
      },
    });

    const fromB = localPullSync(deviceB);
    expect(fromB.bookmarks.map((b) => b.key).sort()).toEqual(["1:1", "2:255"]);
    expect(fromB.notes[0]?.text).toBe("آية الكرسي من الجهاز أ");
    expect(fromB.study?.[0]?.id).toBe("study_a1");
    expect(fromB.progress.lastPage).toBe(42);

    localPushSync(deviceB, {
      bookmarks: [
        ...fromB.bookmarks,
        {
          key: "112:1",
          surahId: 112,
          verse: 1,
          page: 604,
          savedAt: 1_800_000_000_500,
        },
      ],
      notes: fromB.notes,
      study: fromB.study || [],
      progress: { lastPage: 604, habit: { streak: 4 }, updatedAt: null },
    });

    const backOnA = localPullSync(deviceA);
    expect(backOnA.bookmarks).toHaveLength(3);
    expect(backOnA.bookmarks.some((b) => b.key === "112:1")).toBe(true);
    expect(backOnA.progress.lastPage).toBe(604);

    const stats = localAdminStats();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(1);
    expect(stats.totalBookmarks).toBeGreaterThanOrEqual(3);
    expect(stats.totalNotes).toBeGreaterThanOrEqual(1);
  });
});
