/** Split comma/semicolon/newline-separated API keys; preserve order. */
export function parseApiKeys(...raw: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of raw) {
    if (!chunk) continue;
    for (const part of chunk.split(/[,;\n\r]+/)) {
      const key = part.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** Rotate on auth / quota / payment-required failures. */
export function shouldRotateApiKey(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status === 402;
}
