import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isSafeLibrarySlug,
  resolveContainedLibraryPath,
} from "@/lib/library/paths";

describe("isSafeLibrarySlug", () => {
  it("accepts normal catalog ids", () => {
    expect(isSafeLibrarySlug("al-mukhtasar-al-nahw")).toBe(true);
    expect(isSafeLibrarySlug("book1")).toBe(true);
  });

  it("rejects traversal and separators", () => {
    expect(isSafeLibrarySlug("../etc")).toBe(false);
    expect(isSafeLibrarySlug("..")).toBe(false);
    expect(isSafeLibrarySlug("a/../b")).toBe(false);
    expect(isSafeLibrarySlug("a/b")).toBe(false);
    expect(isSafeLibrarySlug("a\\b")).toBe(false);
    expect(isSafeLibrarySlug("")).toBe(false);
  });
});

describe("resolveContainedLibraryPath", () => {
  const root = path.join("/tmp", "arabya-imported-library");

  it("resolves a safe slug under root", () => {
    const resolved = resolveContainedLibraryPath(root, "my-book", "book.pdf");
    expect(resolved).toBe(path.join(root, "my-book", "book.pdf"));
  });

  it("returns null for traversal slugs", () => {
    expect(
      resolveContainedLibraryPath(root, "../secrets", "book.pdf"),
    ).toBeNull();
    expect(resolveContainedLibraryPath(root, "..", "book.pdf")).toBeNull();
  });
});
