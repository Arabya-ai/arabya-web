import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { importedCoverPath } from "@/lib/library/covers";
import { getLibraryWork } from "@/lib/library";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const work = await getLibraryWork(slug);
  if (!work) return apiError("not_found", 404);

  const coverPath = importedCoverPath(slug);
  if (!coverPath) return apiError("not_found", 404);
  try {
    const buffer = await readFile(coverPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return apiError("not_found", 404);
  }
}
