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

async function loadSiteAppearanceUncached(): Promise<SiteAppearance> {
  const file = await readSiteAppearanceFile();
  if (!isCloudSyncConfigured()) return file;

  const cloud = await fetchCloudSiteAppearance();
  if (!cloud) return file;

  return normalizeSiteAppearance({
    ...file,
    ...cloud,
  });
}

export const getSiteAppearance = unstable_cache(
  loadSiteAppearanceUncached,
  ["site-appearance-v1"],
  { tags: [APPEARANCE_TAG], revalidate: 60 },
);

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
