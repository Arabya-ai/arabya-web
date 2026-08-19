import { auth } from "@/auth";
import {
  canAccessAdmin,
  canAccessEditorialTools,
  canAccessStudio,
  type UserRole,
} from "@/lib/roles";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }
  if (session.error === "Banned") {
    return { error: NextResponse.json({ ok: false, error: "banned" }, { status: 403 }) };
  }
  return {
    session,
    email: session.user.email,
    role: (session.user.role ?? "member") as UserRole,
    name: session.user.name,
    image: session.user.image,
  };
}

export async function requireAdmin() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.session.user?.roleUnverified) {
    return {
      error: NextResponse.json(
        { ok: false, error: "role_unverified" },
        { status: 503 },
      ),
    };
  }
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
  if (result.session.user?.roleUnverified) {
    return {
      error: NextResponse.json(
        { ok: false, error: "role_unverified" },
        { status: 503 },
      ),
    };
  }
  if (!canAccessStudio(result.role)) {
    return {
      error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }
  return result;
}

export async function requireEditorial() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.session.user?.roleUnverified) {
    return {
      error: NextResponse.json(
        { ok: false, error: "role_unverified" },
        { status: 503 },
      ),
    };
  }
  if (!canAccessEditorialTools(result.role)) {
    return {
      error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }
  return result;
}
