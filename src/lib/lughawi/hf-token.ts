/**
 * Resolve Hugging Face token for L3 MoA (server-only).
 * Order: env vars → first enabled admin pool slot (provider=huggingface).
 */

import { listAdminPoolDecrypted } from "@/lib/lughawi/admin-pool-store";

export function resolveHfTokenForMoa(): string {
  const fromEnv =
    process.env.LUGHAWI_HF_TOKEN?.trim() ||
    process.env.HF_TOKEN?.trim() ||
    process.env.HUGGING_FACE_HUB_TOKEN?.trim() ||
    process.env.ARABYA_NLP_HF_TOKEN?.trim() ||
    "";
  if (fromEnv) return fromEnv;

  for (const slot of listAdminPoolDecrypted()) {
    if (slot.provider === "huggingface" && slot.apiKey.trim()) {
      return slot.apiKey.trim();
    }
  }
  return "";
}

export function hfMoaReady(): boolean {
  return resolveHfTokenForMoa().length > 0;
}
