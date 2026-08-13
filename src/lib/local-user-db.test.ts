import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getUserDb,
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
});
