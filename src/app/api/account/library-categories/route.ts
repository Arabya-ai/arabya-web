import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import {
  addCustomLibraryCategory,
  listAllLibraryCategories,
} from "@/lib/library/custom-categories";
import { requireEditorial } from "@/lib/require-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  const categories = await listAllLibraryCategories();
  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: Request) {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  let body: { labelAr?: string; labelEn?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiError("invalid_json", 400);
  }
  try {
    const category = await addCustomLibraryCategory({
      labelAr: String(body.labelAr || ""),
      labelEn: body.labelEn,
    });
    return NextResponse.json({ ok: true, category });
  } catch (err) {
    const code = err instanceof Error ? err.message : "category_required";
    return apiError(code, 400);
  }
}
