import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { getLibraryWork, resolveLibraryPdfPath } from "@/lib/library";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const work = await getLibraryWork(slug);
  if (!work) return apiError("not_found", 404);

  const pdfPath = resolveLibraryPdfPath(slug);
  if (!pdfPath) return apiError("not_found", 404);

  try {
    const buffer = await readFile(pdfPath);
    const filename = `${slug}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return apiError("not_found", 404);
  }
}
