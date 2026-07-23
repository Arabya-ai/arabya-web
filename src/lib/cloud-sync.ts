import type { Bookmark } from "@/lib/bookmarks";
import type { AyahNote } from "@/lib/ayah-notes";
import type { ReadingHabitState } from "@/lib/reading-habit";
import type { UserRole } from "@/lib/roles";
import { isEnvAdminEmail } from "@/lib/roles";

export type SyncProgress = {
  lastPage: number | null;
  habit: ReadingHabitState | Record<string, unknown>;
  updatedAt?: number | null;
};

export type SyncPayload = {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  progress: SyncProgress;
};

export type AdminStats = {
  totalUsers: number;
  admins: number;
  editors: number;
  users: number;
  pendingRoleRequests: number;
  activeLast7Days: number;
  totalBookmarks: number;
  totalNotes: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  status: string;
  lastSeenAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type RoleRequestRow = {
  id: string;
  userId: string;
  message: string;
  status: string;
  reviewNote?: string | null;
  createdAt: number;
  updatedAt: number;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function isCloudSyncConfigured(): boolean {
  return Boolean(
    process.env.ARABYA_SYNC_URL?.trim() &&
      process.env.ARABYA_SYNC_SECRET?.trim() &&
      process.env.ARABYA_D1_ENABLED === "1",
  );
}

function syncBaseUrl(): string {
  return (process.env.ARABYA_SYNC_URL || "").replace(/\/$/, "");
}

function syncSecret(): string {
  return process.env.ARABYA_SYNC_SECRET || "";
}

async function callWorker<T extends Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!isCloudSyncConfigured()) {
    throw new Error("cloud_sync_not_configured");
  }

  const res = await fetch(`${syncBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${syncSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as T & {
    ok?: boolean;
    error?: string;
    message?: string;
  };

  if (!res.ok || data.ok === false) {
    throw new Error(data.message || data.error || `sync_http_${res.status}`);
  }

  return data;
}

function profileBody(user: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  return {
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    ensureAdmin: isEnvAdminEmail(user.email),
  };
}

export async function fetchCloudRole(email: string): Promise<UserRole | null> {
  if (!isCloudSyncConfigured()) return null;
  try {
    const data = await callWorker<{ role?: UserRole }>(
      "/v1/role",
      { email, ensureAdmin: isEnvAdminEmail(email) },
    );
    return data.role ?? null;
  } catch {
    return null;
  }
}

export async function pullCloudSync(user: {
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}) {
  const data = await callWorker<
    SyncPayload & { ok: boolean; userId?: string; role?: UserRole }
  >("/v1/pull", profileBody(user));
  return {
    ok: true as const,
    userId: data.userId,
    role: data.role,
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    progress: data.progress || { lastPage: null, habit: {}, updatedAt: null },
  };
}

export async function pushCloudSync(
  user: {
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
  },
  payload: SyncPayload,
) {
  const data = await callWorker<
    SyncPayload & { ok: boolean; userId?: string; role?: UserRole }
  >("/v1/push", {
    ...profileBody(user),
    bookmarks: payload.bookmarks,
    notes: payload.notes,
    progress: {
      lastPage: payload.progress.lastPage,
      habit: payload.progress.habit,
    },
  });
  return {
    ok: true as const,
    userId: data.userId,
    role: data.role,
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    progress: data.progress || { lastPage: null, habit: {}, updatedAt: null },
  };
}

export async function getRoleRequest(email: string) {
  return callWorker<{ request: RoleRequestRow | null }>("/v1/role-request", {
    email,
    action: "get",
  });
}

export async function createRoleRequest(
  user: { email: string; name?: string | null; image?: string | null },
  message: string,
) {
  return callWorker<{ id: string; status: string }>("/v1/role-request", {
    ...profileBody(user),
    action: "create",
    message,
  });
}

export async function adminGetStats(actorEmail: string) {
  return callWorker<{ stats: AdminStats }>("/v1/admin/stats", { actorEmail });
}

export async function adminListUsers(
  actorEmail: string,
  opts: { q?: string; role?: string; limit?: number; offset?: number } = {},
) {
  return callWorker<{
    users: AdminUserRow[];
    total: number;
    limit: number;
    offset: number;
  }>("/v1/admin/users", {
    actorEmail,
    q: opts.q || "",
    role: opts.role || "",
    limit: opts.limit ?? 50,
    offset: opts.offset ?? 0,
  });
}

export async function adminGetUser(actorEmail: string, userId: string) {
  return callWorker<{
    user: AdminUserRow;
    bookmarkCount: number;
    noteCount: number;
  }>("/v1/admin/user", { actorEmail, userId });
}

export async function adminSetRole(
  actorEmail: string,
  userId: string,
  role: "user" | "editor",
  reason?: string,
) {
  return callWorker<{ role: string; fromRole?: string }>(
    "/v1/admin/set-role",
    { actorEmail, userId, role, reason: reason || "" },
  );
}

export async function adminDeleteUser(
  actorEmail: string,
  userId: string,
  reason?: string,
) {
  return callWorker<{ deleted: string }>("/v1/admin/delete-user", {
    actorEmail,
    userId,
    reason: reason || "",
  });
}

export async function adminListRoleRequests(
  actorEmail: string,
  status = "pending",
) {
  return callWorker<{ requests: RoleRequestRow[] }>(
    "/v1/admin/role-requests",
    { actorEmail, action: "list", status },
  );
}

export async function adminReviewRoleRequest(
  actorEmail: string,
  requestId: string,
  decision: "approved" | "rejected",
  reviewNote?: string,
) {
  return callWorker<{ decision: string }>("/v1/admin/role-requests", {
    actorEmail,
    action: "review",
    requestId,
    decision,
    reviewNote: reviewNote || "",
  });
}

export async function adminListAudit(actorEmail: string) {
  return callWorker<{
    entries: Array<{
      id: string;
      userId: string;
      actorId: string | null;
      fromRole: string | null;
      toRole: string;
      reason: string | null;
      createdAt: number;
    }>;
  }>("/v1/admin/audit", { actorEmail });
}
