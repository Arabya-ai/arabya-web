import { auth } from "@/auth";
import { getQuota } from "@/lib/lughawi/quota-store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || session?.error === "Banned") {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  return NextResponse.json(getQuota(email));
}
