import { parseApiKeys, shouldRotateApiKey } from "@/lib/api-keys";

/** @deprecated Prefer parseApiKeys — kept for existing imports/tests. */
export function parsePexelsKeys(...raw: Array<string | undefined>): string[] {
  return parseApiKeys(...raw);
}

/** @deprecated Prefer shouldRotateApiKey. */
export function shouldRotatePexelsKey(status: number): boolean {
  return shouldRotateApiKey(status);
}
