import { NextResponse } from "next/server";
import { getLibraryCatalogForEditors } from "@/lib/library";
import { requireEditorial } from "@/lib/require-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  const works = await getLibraryCatalogForEditors();
  return NextResponse.json({ ok: true, works });
}
