import {
  MEMBER_DAILY_VIDEO_EXPORT_LIMIT,
  dailyVideoExportLimit,
  type UserRole,
} from "@/lib/roles";

const STORAGE_PREFIX = "ayat_studio_video_exports:";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function storageKey(email: string): string {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}:${todayKey()}`;
}

export type VideoExportQuota = {
  limit: number | null;
  used: number;
  remaining: number | null;
  blocked: boolean;
};

export function getVideoExportQuota(
  role: UserRole | null | undefined,
  email: string | null | undefined,
): VideoExportQuota {
  const limit = dailyVideoExportLimit(role, email);
  if (limit === null) {
    return { limit: null, used: 0, remaining: null, blocked: false };
  }
  if (!email || typeof window === "undefined") {
    return {
      limit,
      used: 0,
      remaining: limit,
      blocked: false,
    };
  }
  let used = 0;
  try {
    used = Math.max(
      0,
      Number.parseInt(localStorage.getItem(storageKey(email)) || "0", 10) || 0,
    );
  } catch {
    used = 0;
  }
  const remaining = Math.max(0, limit - used);
  return {
    limit,
    used,
    remaining,
    blocked: used >= limit,
  };
}

/** Call only after a successful MP4 export. */
export function recordSuccessfulVideoExport(
  role: UserRole | null | undefined,
  email: string | null | undefined,
): VideoExportQuota {
  const before = getVideoExportQuota(role, email);
  if (before.limit === null || !email || typeof window === "undefined") {
    return before;
  }
  const next = before.used + 1;
  try {
    localStorage.setItem(storageKey(email), String(next));
  } catch {
    /* ignore quota storage failures */
  }
  return getVideoExportQuota(role, email);
}

export { MEMBER_DAILY_VIDEO_EXPORT_LIMIT };
