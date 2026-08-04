import { promises as fs } from "fs";
import path from "path";
import {
  normalizeSiteAppearance,
  type SiteAppearance,
  DEFAULT_SITE_APPEARANCE,
} from "@/lib/site-appearance";

const DATA_FILE = path.join(process.cwd(), "data", "site-appearance.json");

export async function readSiteAppearanceFile(): Promise<SiteAppearance> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteAppearance>;
    return normalizeSiteAppearance(parsed);
  } catch {
    return { ...DEFAULT_SITE_APPEARANCE };
  }
}

export async function writeSiteAppearanceFile(
  appearance: SiteAppearance,
): Promise<void> {
  const payload = normalizeSiteAppearance(appearance);
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(
    DATA_FILE,
    `${JSON.stringify(
      {
        footerCreditAr: payload.footerCreditAr,
        footerCreditEn: payload.footerCreditEn,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}
