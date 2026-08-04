import { NextResponse } from "next/server";
import { getSiteAppearanceState } from "@/lib/site-appearance-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public read of site chrome appearance (footer credit templates). */
export async function GET() {
  try {
    const state = await getSiteAppearanceState();
    return NextResponse.json(
      {
        ok: true,
        appearance: state.appearance,
        syncConfigured: state.syncConfigured,
        cloudReachable: state.cloudReachable,
        source: state.source,
        env: state.env,
        cloudError: state.cloudError,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
