import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import {
  canAccessAdmin,
  canAccessEditorialTools,
  canAccessStudio,
  type UserRole,
} from "@/lib/roles";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: apiError("unauthorized", 401) };
  }
  if (session.error === "Banned") {
    return { error: apiError("banned", 403) };
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
    return { error: apiError("role_unverified", 503) };
  }
  if (!canAccessAdmin(result.role)) {
    return { error: apiError("forbidden", 403) };
  }
  return result;
}

export async function requireStudio() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.session.user?.roleUnverified) {
    return { error: apiError("role_unverified", 503) };
  }
  if (!canAccessStudio(result.role)) {
    return { error: apiError("forbidden", 403) };
  }
  return result;
}

export async function requireEditorial() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.session.user?.roleUnverified) {
    return { error: apiError("role_unverified", 503) };
  }
  if (!canAccessEditorialTools(result.role)) {
    return { error: apiError("forbidden", 403) };
  }
  return result;
}
