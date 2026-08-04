import { unstable_cache, revalidateTag } from "next/cache";
import {
  fetchCloudSiteAppearance,
  isCloudSyncConfigured,
  adminGetSiteAppearance,
  adminSetSiteAppearance,
} from "@/lib/cloud-sync";
import {
  creditForLocale,
  normalizeSiteAppearance,
  type SiteAppearance,
} from "@/lib/site-appearance";
import {
  readSiteAppearanceFile,
  writeSiteAppearanceFile,
} from "@/lib/site-appearance-fs";
import type { AppLocale } from "@/i18n/routing";

const APPEARANCE_TAG = "site-appearance";

async function loadSiteAppearanceUncached(): Promise<{
  appearance: SiteAppearance;
  syncConfigured: boolean;
  cloudReachable: boolean;
}> {
  const file = await readSiteAppearanceFile();
  const syncConfigured = isCloudSyncConfigured();
  if (!syncConfigured) {
    return { appearance: file, syncConfigured, cloudReachable: false };
  }

  const cloud = await fetchCloudSiteAppearance();
  if (!cloud) {
    return { appearance: file, syncConfigured, cloudReachable: false };
  }

  // Cloud defaults (no updatedAt) must not override the repo/file seed.
  if (!cloud.updatedAt) {
    return { appearance: file, syncConfigured, cloudReachable: true };
  }

  return {
    appearance: normalizeSiteAppearance({
      ...file,
      ...cloud,
    }),
    syncConfigured,
    cloudReachable: true,
  };
}

export const getSiteAppearanceState = unstable_cache(
  loadSiteAppearanceUncached,
  ["site-appearance-state-v2"],
  { tags: [APPEARANCE_TAG], revalidate: 30 },
);

export async function getSiteAppearance(): Promise<SiteAppearance> {
  const cached = await getSiteAppearanceState();
  return cached.appearance;
}

export async function getFooterCredit(
  locale: AppLocale | string,
): Promise<string> {
  const appearance = await getSiteAppearance();
  return creditForLocale(appearance, locale);
}

export function revalidateSiteAppearance(): void {
  revalidateTag(APPEARANCE_TAG);
}

export async function loadAdminSiteAppearance(
  actorEmail: string,
): Promise<{
  appearance: SiteAppearance;
  source: "cloud" | "file";
  syncConfigured: boolean;
}> {
  const syncConfigured = isCloudSyncConfigured();
  if (syncConfigured) {
    try {
      const data = await adminGetSiteAppearance(actorEmail);
      return {
        appearance: normalizeSiteAppearance(data.appearance),
        source: "cloud",
        syncConfigured,
      };
    } catch {
      const file = await readSiteAppearanceFile();
      return { appearance: file, source: "file", syncConfigured };
    }
  }
  const file = await readSiteAppearanceFile();
  return { appearance: file, source: "file", syncConfigured };
}

export async function saveAdminSiteAppearance(
  actorEmail: string,
  input: { footerCreditAr: string; footerCreditEn: string },
): Promise<{
  appearance: SiteAppearance;
  source: "cloud" | "file";
}> {
  const next = normalizeSiteAppearance({
    ...input,
    updatedAt: Date.now(),
    updatedBy: actorEmail,
  });

  if (isCloudSyncConfigured()) {
    const data = await adminSetSiteAppearance(actorEmail, {
      footerCreditAr: next.footerCreditAr,
      footerCreditEn: next.footerCreditEn,
    });
    // Keep git/file seed in sync when filesystem is writable (local/dev).
    try {
      await writeSiteAppearanceFile(next);
    } catch {
      /* Vercel FS is read-only — cloud is source of truth */
    }
    revalidateSiteAppearance();
    return {
      appearance: normalizeSiteAppearance(data.appearance),
      source: "cloud",
    };
  }

  await writeSiteAppearanceFile(next);
  revalidateSiteAppearance();
  return { appearance: next, source: "file" };
}
