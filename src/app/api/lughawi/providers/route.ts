import { auth } from "@/auth";
import { listProviderStatus } from "@/lib/lughawi/credentials-store";
import { AI_PROVIDERS } from "@/lib/lughawi/types";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || session?.error === "Banned") {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  const status = listProviderStatus(email);
  const providers = AI_PROVIDERS.map((p) => {
    const s = status.find((x) => x.id === p.id);
    return {
      id: p.id,
      label: p.label,
      configured: s?.configured ?? false,
      last4: s?.last4,
      isDefault: s?.isDefault ?? false,
    };
  });
  const defaultProvider =
    providers.find((p) => p.isDefault)?.id ??
    providers.find((p) => p.configured)?.id ??
    null;
  return NextResponse.json({ providers, defaultProvider });
}
