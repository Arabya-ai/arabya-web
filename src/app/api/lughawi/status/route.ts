import { learningStats } from "@/lib/lughawi/learning-store";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    offline: true,
    learning: learningStats(),
    note: "Core proofread runs offline. AI rewrite/translate need a key.",
  });
}
