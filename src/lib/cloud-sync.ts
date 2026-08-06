import type { Bookmark } from "@/lib/bookmarks";
import type { AyahNote } from "@/lib/ayah-notes";
import type { ReadingHabitState } from "@/lib/reading-habit";
import type { UserRole } from "@/lib/roles";
import { isEnvAdminEmail } from "@/lib/roles";
import type { StudyEntry } from "@/lib/study-archive";

export type SyncProgress = {
  lastPage: number | null;
  habit: ReadingHabitState | Record<string, unknown>;
  updatedAt?: number | null;
};

export type SyncPayload = {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  study: StudyEntry[];
  progress: SyncProgress;
};

export type AdminStats = {
  totalUsers: number;
  admins: number;
  editors: number;
  creators?: number;
  users: number;
  pendingRoleRequests: number;
  activeLast7Days: number;
  totalBookmarks: number;
  totalNotes: number;
};

export type AdminUserRow = {
  id: string;
  uid?: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole | "user";
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
  targetRole?: string;
  createdAt: number;
  updatedAt: number;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function d1EnabledFlag(): boolean {
  const raw = (process.env.ARABYA_D1_ENABLED || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Safe (non-secret) snapshot of which sync env vars are present. */
export function cloudSyncEnvStatus(): {
  hasSyncUrl: boolean;
  hasSyncSecret: boolean;
  d1Enabled: boolean;
  d1Raw: string;
  syncHost: string | null;
} {
  const urlRaw = (process.env.ARABYA_SYNC_URL || "").trim();
  let syncHost: string | null = null;
  try {
    if (urlRaw) syncHost = new URL(urlRaw).host;
  } catch {
    syncHost = "invalid_url";
  }
  return {
    hasSyncUrl: Boolean(urlRaw),
    hasSyncSecret: Boolean(process.env.ARABYA_SYNC_SECRET?.trim()),
    d1Enabled: d1EnabledFlag(),
    d1Raw: (process.env.ARABYA_D1_ENABLED || "").trim().slice(0, 16),
    syncHost,
  };
}

export function isCloudSyncConfigured(): boolean {
  const env = cloudSyncEnvStatus();
  return env.hasSyncUrl && env.hasSyncSecret && env.d1Enabled;
}

function syncBaseUrl(): string {
  return (process.env.ARABYA_SYNC_URL || "").trim().replace(/\/$/, "");
}

function syncSecret(): string {
  return (process.env.ARABYA_SYNC_SECRET || "").trim();
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

  let data: T & {
    ok?: boolean;
    error?: string;
    message?: string;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error(`sync_bad_json_${res.status}`);
  }

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

export async function fetchCloudRoleStatus(
  email: string,
): Promise<{ role: UserRole | null; banned: boolean; unreachable?: boolean }> {
  if (!isCloudSyncConfigured()) return { role: null, banned: false };
  try {
    const data = await callWorker<{ role?: UserRole; banned?: boolean }>(
      "/v1/role",
      { email, ensureAdmin: isEnvAdminEmail(email) },
    );
    return {
      role: data.role ?? null,
      banned: data.banned === true,
    };
  } catch {
    // Do not invent "not banned" — callers must keep prior token state.
    return { role: null, banned: false, unreachable: true };
  }
}

export async function fetchCloudRole(email: string): Promise<UserRole | null> {
  const status = await fetchCloudRoleStatus(email);
  if (status.banned) return null;
  return status.role;
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
    study: Array.isArray(data.study) ? data.study : [],
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
    study: payload.study,
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
    study: Array.isArray(data.study) ? data.study : [],
    progress: data.progress || { lastPage: null, habit: {}, updatedAt: null },
  };
}

export async function studioListUploads(actorEmail: string) {
  return callWorker<{ uploads: SourceUploadRow[] }>("/v1/studio/uploads", {
    actorEmail,
    action: "list",
  });
}

export async function studioCreateUpload(
  actorEmail: string,
  input: { filename: string; payload: string; notes?: string; kind?: string },
) {
  return callWorker<{ id: string; status: string }>("/v1/studio/uploads", {
    actorEmail,
    action: "create",
    ...input,
  });
}

export type SourceUploadRow = {
  id: string;
  uploaderId: string;
  filename: string;
  kind: string;
  notes?: string | null;
  status: string;
  createdAt: number;
  bytes?: number;
};

export async function getRoleRequest(email: string) {
  return callWorker<{ request: RoleRequestRow | null }>("/v1/role-request", {
    email,
    action: "get",
  });
}

export async function createRoleRequest(
  user: { email: string; name?: string | null; image?: string | null },
  message: string,
  targetRole: "editor" | "admin" = "editor",
) {
  return callWorker<{ id: string; status: string }>("/v1/role-request", {
    ...profileBody(user),
    action: "create",
    message,
    targetRole,
  });
}

export async function adminBanUser(
  actorEmail: string,
  userId: string,
  banned: boolean,
  reason?: string,
) {
  return callWorker<{ status: string }>("/v1/admin/ban-user", {
    actorEmail,
    userId,
    banned,
    reason: reason || "",
  });
}

export async function adminGetPortfolio(actorEmail: string, userId: string) {
  return callWorker<{
    user: AdminUserRow & { uid?: string };
    bookmarkCount: number;
    noteCount: number;
    bookmarks: unknown[];
    notes: unknown[];
    study?: unknown[];
  }>("/v1/admin/portfolio", { actorEmail, userId });
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
  role: UserRole | "user",
  reason?: string,
) {
  const normalized = role === "user" ? "member" : role;
  return callWorker<{ role: string; fromRole?: string }>(
    "/v1/admin/set-role",
    {
      actorEmail,
      userId,
      role: normalized,
      reason: reason || "",
    },
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

export type CloudSiteAppearance = {
  footerCreditAr: string;
  footerCreditEn: string;
  updatedAt?: number | null;
  updatedBy?: string | null;
};

export async function fetchCloudSiteAppearance(): Promise<CloudSiteAppearance | null> {
  if (!isCloudSyncConfigured()) return null;
  try {
    const data = await callWorker<{ appearance?: CloudSiteAppearance }>(
      "/v1/site-appearance",
      { action: "get" },
    );
    return data.appearance ?? null;
  } catch {
    return null;
  }
}

/** Like fetchCloudSiteAppearance but returns a safe error code when cloud fails. */
export async function fetchCloudSiteAppearanceDetailed(): Promise<{
  appearance: CloudSiteAppearance | null;
  error: string | null;
}> {
  if (!isCloudSyncConfigured()) {
    return { appearance: null, error: "not_configured" };
  }
  try {
    const data = await callWorker<{ appearance?: CloudSiteAppearance }>(
      "/v1/site-appearance",
      { action: "get" },
    );
    return { appearance: data.appearance ?? null, error: null };
  } catch (err) {
    return {
      appearance: null,
      error: err instanceof Error ? err.message.slice(0, 80) : "fetch_failed",
    };
  }
}

export async function adminGetSiteAppearance(actorEmail: string) {
  return callWorker<{ appearance: CloudSiteAppearance }>(
    "/v1/admin/site-appearance",
    { actorEmail, action: "get" },
  );
}

export async function adminSetSiteAppearance(
  actorEmail: string,
  input: { footerCreditAr: string; footerCreditEn: string },
) {
  return callWorker<{ appearance: CloudSiteAppearance }>(
    "/v1/admin/site-appearance",
    {
      actorEmail,
      action: "set",
      footerCreditAr: input.footerCreditAr,
      footerCreditEn: input.footerCreditEn,
    },
  );
}
