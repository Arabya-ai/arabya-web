import { NextResponse } from "next/server";
import { getSiteAppearance } from "@/lib/site-appearance-store";

export const dynamic = "force-dynamic";

/** Public read of site chrome appearance (footer credit templates). */
export async function GET() {
  try {
    const appearance = await getSiteAppearance();
    return NextResponse.json(
      { ok: true, appearance },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
