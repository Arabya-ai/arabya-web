/** Shared request-query hardening for public JSON APIs. */

export const MAX_SEARCH_QUERY_LENGTH = 120;

/**
 * Trim, length-cap, and strip control characters from user search text.
 * Returns null when the query is unusable after sanitization.
 */
export function sanitizeSearchQuery(
  raw: string | null | undefined,
  options?: { minLength?: number; maxLength?: number },
): string | null {
  const minLength = options?.minLength ?? 2;
  const maxLength = options?.maxLength ?? MAX_SEARCH_QUERY_LENGTH;

  let q = String(raw ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .normalize("NFC")
    .trim();

  if (q.length > maxLength) {
    q = q.slice(0, maxLength).trim();
  }

  if (q.length < minLength) return null;
  return q;
}
