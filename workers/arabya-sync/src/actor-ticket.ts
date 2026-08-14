/** HMAC actor ticket verify — keep in sync with src/lib/actor-ticket.ts */

const TICKET_AUD = "arabya-sync";

export type ActorTicketClaims = {
  sub: string;
  aud: string;
  iat: number;
  exp: number;
};

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

export async function verifyActorTicket(
  token: string | null | undefined,
  secret: string,
): Promise<ActorTicketClaims | null> {
  if (!token || !secret) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [payload, sigPart] = parts;
  if (!payload || !sigPart) return null;

  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sigPart) as BufferSource,
      new TextEncoder().encode(payload),
    );
    if (!ok) return null;

    const claims = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payload)),
    ) as ActorTicketClaims;
    if (claims.aud !== TICKET_AUD) return null;
    if (!claims.sub || typeof claims.sub !== "string") return null;
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(claims.exp) || claims.exp < now) return null;
    if (!Number.isFinite(claims.iat) || claims.iat > now + 60) return null;
    return {
      sub: claims.sub.trim().toLowerCase(),
      aud: claims.aud,
      iat: claims.iat,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}

export function isServiceActor(sub: string): boolean {
  return sub.startsWith("service:");
}
