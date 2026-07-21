import { beforeEach, describe, expect, it } from "vitest";
import { getAyahNote, readAyahNotes, saveAyahNote } from "@/lib/ayah-notes";

function mockLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
    configurable: true,
  });
}

describe("ayah-notes", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("saves and reads a note by verse key", () => {
    saveAyahNote({
      key: "2:255",
      surahId: 2,
      verse: 255,
      text: "آية الكرسي",
    });
    const note = getAyahNote("2:255");
    expect(note?.text).toBe("آية الكرسي");
    expect(note?.surahId).toBe(2);
  });

  it("removes note when text is empty", () => {
    saveAyahNote({
      key: "1:1",
      surahId: 1,
      verse: 1,
      text: "ملاحظة",
    });
    saveAyahNote({ key: "1:1", surahId: 1, verse: 1, text: "   " });
    expect(getAyahNote("1:1")).toBeNull();
    expect(readAyahNotes()).toHaveLength(0);
  });
});
