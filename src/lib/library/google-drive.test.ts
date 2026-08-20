import { describe, expect, it } from "vitest";
import {
  googleDrivePreviewUrl,
  isGoogleDriveLibraryUrl,
  parseGoogleDriveFileId,
  resolveGoogleDriveUrls,
} from "@/lib/library/google-drive";

describe("google drive urls", () => {
  it("parses file share links", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz";
    expect(
      parseGoogleDriveFileId(
        `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      ),
    ).toBe(id);
    expect(parseGoogleDriveFileId(`https://drive.google.com/open?id=${id}`)).toBe(
      id,
    );
  });

  it("builds preview and thumbnail urls", () => {
    const id = "abc123";
    const resolved = resolveGoogleDriveUrls(
      `https://drive.google.com/file/d/${id}/view`,
    );
    expect(resolved?.previewUrl).toBe(googleDrivePreviewUrl(id));
    expect(resolved?.thumbnailUrl).toContain(id);
  });

  it("detects drive library urls", () => {
    expect(isGoogleDriveLibraryUrl(googleDrivePreviewUrl("x"))).toBe(true);
    expect(isGoogleDriveLibraryUrl("/media/library/foo.pdf")).toBe(false);
  });
});
