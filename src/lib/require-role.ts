import { auth } from "@/auth";
import { canAccessAdmin, canAccessStudio, type UserRole } from "@/lib/roles";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }
  return {
    session,
    email: session.user.email,
    role: (session.user.role ?? "user") as UserRole,
    name: session.user.name,
    image: session.user.image,
  };
}

export async function requireAdmin() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (!canAccessAdmin(result.role)) {
    return {
      error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireStudio() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (!canAccessStudio(result.role)) {
    return {
      error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }
  return result;
}
