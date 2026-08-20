/** Parse a public Google Drive share / open URL into a file id. */
export function parseGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function googleDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function googleDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function googleDriveThumbnailUrl(fileId: string, width = 480): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

export function resolveGoogleDriveUrls(
  shareUrl: string,
): { fileId: string; previewUrl: string; viewUrl: string; thumbnailUrl: string } | null {
  const fileId = parseGoogleDriveFileId(shareUrl);
  if (!fileId) return null;
  return {
    fileId,
    previewUrl: googleDrivePreviewUrl(fileId),
    viewUrl: googleDriveViewUrl(fileId),
    thumbnailUrl: googleDriveThumbnailUrl(fileId),
  };
}

export function isGoogleDriveLibraryUrl(url: string): boolean {
  return url.includes("drive.google.com");
}

export function isExternalLibraryPdfUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
