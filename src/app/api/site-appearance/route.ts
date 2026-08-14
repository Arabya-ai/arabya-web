import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSiteAppearanceState } from "@/lib/site-appearance-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public read of site chrome appearance (footer credit templates). */
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, {
    prefix: "site-appearance",
    limit: 60,
  });
  if (limited) return limited;
  try {
    const state = await getSiteAppearanceState();
    return NextResponse.json(
      {
        ok: true,
        appearance: state.appearance,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
