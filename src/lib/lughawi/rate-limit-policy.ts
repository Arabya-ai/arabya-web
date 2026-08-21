import type { Session } from "next-auth";

import type { UserRole } from "@/lib/roles";

/** Admin / editor accounts never hit Lughawi API rate limits. */
export function isLughawiUnlimitedRole(
  role: UserRole | string | null | undefined,
): boolean {
  return role === "admin" || role === "editor";
}

export function sessionSkipsLughawiRateLimit(
  session: Session | null | undefined,
): boolean {
  const role = session?.user?.role;
  if (session?.user?.roleUnverified) return false;
  return isLughawiUnlimitedRole(role);
}
