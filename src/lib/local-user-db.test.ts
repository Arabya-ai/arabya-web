import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getUserDb,
  localAdminBanUser,
  localAdminDeleteUser,
  localAdminGetUser,
  localAdminListUsers,
  localAdminReviewRoleRequest,
  localAdminSetRole,
  localAdminStats,
  localPullSync,
  localPushSync,
  localSaveTahfeezPortfolio,
  readUiSuperAdminEmails,
  resetUserDbForTests,
} from "@/lib/local-user-db";
import { isSuperAdminEmail } from "@/lib/roles";
import { emptyTahfeezPortfolio } from "@/lib/tahfeez/types";

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

  it("sanitizes adhkar payload keys and bounds on push", () => {
    getUserDb();
    const user = { email: "adhkar@example.com", name: "A", image: null };
    const pushed = localPushSync(user, {
      bookmarks: [],
      notes: [],
      study: [],
      progress: {
        lastPage: 1,
        habit: {},
        adhkar: JSON.parse(
          '{"morning-1":3,"__proto__":9,"bad key":4,"ok-id":1000000000}',
        ) as Record<string, number>,
        tasbeeh: { phraseId: "subhanallah", count: 12 },
      },
    });
    expect(pushed.progress.adhkar).toEqual({
      "morning-1": 3,
      "ok-id": 1_000_000,
    });
    expect(pushed.progress.tasbeeh).toEqual({
      phraseId: "subhanallah",
      count: 12,
    });
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

  it("lists CRM members with recitation stats from the same user row", () => {
    getUserDb();
    const user = {
      email: "hifz@example.com",
      name: "Hifz User",
      image: null,
    };
    localPushSync(user, {
      bookmarks: [
        {
          key: "1:1",
          surahId: 1,
          verse: 1,
          page: 1,
          savedAt: 1_900_000_000_000,
        },
      ],
      notes: [],
      study: [],
      progress: { lastPage: 3, habit: {}, updatedAt: null },
    });
    localSaveTahfeezPortfolio(user, {
      ...emptyTahfeezPortfolio(),
      stats: {
        ...emptyTahfeezPortfolio().stats,
        overallAccuracy: 91,
      },
      sessions: [
        {
          id: "s1",
          surahId: 1,
          surahName: "الفاتحة",
          ayahStart: 1,
          ayahEnd: 7,
          accuracy: 90,
          correct: 9,
          wrong: 1,
          skipped: 0,
          totalWords: 10,
          durationSec: 40,
          completedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "s2",
          surahId: 2,
          surahName: "البقرة",
          ayahStart: 1,
          ayahEnd: 5,
          accuracy: 92,
          correct: 10,
          wrong: 1,
          skipped: 0,
          totalWords: 11,
          durationSec: 50,
          completedAt: "2026-08-02T00:00:00.000Z",
        },
      ],
    });

    const { users } = localAdminListUsers({ q: "hifz@example.com" });
    const row = users.find((u) => u.email === "hifz@example.com");
    expect(row?.bookmarkCount).toBe(1);
    expect(row?.tahfeezSessions).toBe(2);
    expect(row?.tahfeezAccuracy).toBeGreaterThan(0);
    const byUid = localAdminGetUser(row?.uid || "");
    const byEmail = localAdminGetUser("hifz@example.com");
    expect(byUid?.user.email).toBe("hifz@example.com");
    expect(byEmail?.user.email).toBe("hifz@example.com");
    expect(byEmail?.bookmarkCount).toBe(1);
  });
});

describe("local-user-db admin actor gates", () => {
  let tmpDir: string;
  const prevPath = process.env.ARABYA_USER_DB_PATH;
  const prevAdmins = process.env.ARABYA_ADMIN_EMAILS;
  const prevSync = process.env.ARABYA_USER_SYNC_ENABLED;
  const SUPER = "owner-super@example.com";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arabya-user-db-admin-"));
    process.env.ARABYA_USER_DB_PATH = path.join(tmpDir, "test.sqlite");
    process.env.ARABYA_ADMIN_EMAILS = SUPER;
    process.env.ARABYA_USER_SYNC_ENABLED = "1";
    resetUserDbForTests();
    getUserDb();
    localPushSync(
      { email: "member@example.com", name: "M", image: null },
      {
        bookmarks: [],
        notes: [],
        study: [],
        progress: { lastPage: 1, habit: {}, updatedAt: null },
      },
    );
  });

  afterEach(() => {
    resetUserDbForTests({ deleteFile: true });
    if (prevPath === undefined) delete process.env.ARABYA_USER_DB_PATH;
    else process.env.ARABYA_USER_DB_PATH = prevPath;
    if (prevAdmins === undefined) delete process.env.ARABYA_ADMIN_EMAILS;
    else process.env.ARABYA_ADMIN_EMAILS = prevAdmins;
    if (prevSync === undefined) delete process.env.ARABYA_USER_SYNC_ENABLED;
    else process.env.ARABYA_USER_SYNC_ENABLED = prevSync;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects ban/delete from non–super-admin actors", () => {
    expect(() =>
      localAdminBanUser("editor@example.com", "member@example.com", true),
    ).toThrow("super_admin_required");
    expect(() =>
      localAdminDeleteUser("editor@example.com", "member@example.com"),
    ).toThrow("super_admin_required");
    expect(() =>
      localAdminReviewRoleRequest("editor@example.com", "req_x", "approved"),
    ).toThrow("super_admin_required");
  });

  it("allows super-admin to ban a member", () => {
    const result = localAdminBanUser(SUPER, "member@example.com", true, "test");
    expect(result.status).toBe("banned");
  });

  it("promotes a member to super-admin from CRM and persists UI allowlist", () => {
    const result = localAdminSetRole(
      SUPER,
      "member@example.com",
      "admin",
      "crm_ui",
    );
    expect(result.role).toBe("admin");
    expect(readUiSuperAdminEmails()).toContain("member@example.com");
    expect(isSuperAdminEmail("member@example.com")).toBe(true);

    const demoted = localAdminSetRole(
      SUPER,
      "member@example.com",
      "editor",
      "crm_ui",
    );
    expect(demoted.role).toBe("editor");
    expect(readUiSuperAdminEmails()).not.toContain("member@example.com");
    expect(isSuperAdminEmail("member@example.com")).toBe(false);
  });

  it("refuses demoting env bootstrap super-admin", () => {
    localPushSync(
      { email: SUPER, name: "Owner", image: null },
      {
        bookmarks: [],
        notes: [],
        study: [],
        progress: { lastPage: 1, habit: {}, updatedAt: null },
      },
    );
    expect(() =>
      localAdminSetRole(SUPER, SUPER, "editor", "nope"),
    ).toThrow(/cannot_demote/);
  });
});
