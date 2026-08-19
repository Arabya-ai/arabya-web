/** Build a safe book slug from Arabic/English title. */
export function slugifyBookTitle(title: string, fallback = "book"): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (base.length >= 2) return base;
  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (ascii.length >= 2) return ascii;
  return `${fallback}-${Date.now().toString(36).slice(-6)}`;
}
