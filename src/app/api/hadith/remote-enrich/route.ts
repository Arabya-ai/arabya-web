import { NextResponse } from "next/server";
import {
  HADITH_ENG_EDITION,
  hadithCdnEditionUrl,
} from "@/lib/hadith-isnad-parse";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live enrich a single hadith from fawazahmed0 CDN (grades / English text)
 * without importing full English editions into Git.
 */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, {
    prefix: "hadith-remote-enrich",
    limit: 40,
  });
  if (limited) return limited;

  const url = new URL(req.url);
  const collection = String(url.searchParams.get("collection") || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const number = Number(url.searchParams.get("number") || "0");
  if (!collection || !Number.isFinite(number) || number < 1) {
    return NextResponse.json(
      { ok: false, error: "collection and number required" },
      { status: 400 },
    );
  }

  const engEdition = HADITH_ENG_EDITION[collection];
  const araEdition = `ara-${collection}`;

  try {
    const fetches: Promise<Response>[] = [
      fetch(hadithCdnEditionUrl(araEdition, number), {
        headers: { Accept: "application/json", "User-Agent": "arabya-web" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      }),
    ];
    if (engEdition) {
      fetches.push(
        fetch(hadithCdnEditionUrl(engEdition, number), {
          headers: { Accept: "application/json", "User-Agent": "arabya-web" },
          next: { revalidate: 86400 },
          signal: AbortSignal.timeout(5000),
        }),
      );
    }
    const [araRes, engRes] = await Promise.all(fetches);
    const ara = araRes?.ok ? await araRes.json() : null;
    const eng = engRes?.ok ? await engRes.json() : null;
    const araHit = ara?.hadiths?.[0];
    const engHit = eng?.hadiths?.[0];
    return NextResponse.json({
      ok: true,
      collection,
      number,
      source: "cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1",
      grades: araHit?.grades ?? [],
      englishText: engHit?.text ?? null,
      arabicText: araHit?.text ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cdn enrich failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
