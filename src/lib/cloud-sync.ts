import type { Bookmark } from "@/lib/bookmarks";
import type { AyahNote } from "@/lib/ayah-notes";
import type { ReadingHabitState } from "@/lib/reading-habit";

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

async function callSync(
  path: "/v1/pull" | "/v1/push",
  body: Record<string, unknown>,
): Promise<SyncPayload & { ok: boolean; userId?: string }> {
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

  const data = (await res.json()) as SyncPayload & {
    ok?: boolean;
    error?: string;
    message?: string;
    userId?: string;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.message || data.error || `sync_http_${res.status}`);
  }

  return {
    ok: true,
    userId: data.userId,
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    progress: data.progress || { lastPage: null, habit: {}, updatedAt: null },
  };
}

export async function pullCloudSync(user: {
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}) {
  return callSync("/v1/pull", {
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role || "user",
  });
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
  return callSync("/v1/push", {
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role || "user",
    bookmarks: payload.bookmarks,
    notes: payload.notes,
    progress: {
      lastPage: payload.progress.lastPage,
      habit: payload.progress.habit,
    },
  });
}
