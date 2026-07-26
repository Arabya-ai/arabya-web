import {
  canExportStudioWithoutBrand,
  canExportUnlimitedStudioAyahs as roleCanExportUnlimitedAyahs,
  isSuperAdminEmail,
  type UserRole,
} from "@/lib/roles";

/** Billing/display tiers aligned with roles until PayPal is live. */
export type UserPlan = "free" | "pro" | "plus";

export type AppLocale = "ar" | "en";

/** Owner accounts always on Plus until PayPal billing is live. */
export const OWNER_PLUS_EMAILS = [
  "egywebdev@gmail.com",
  "arabyaaicom@gmail.com",
] as const;

const PLAN_LABELS: Record<AppLocale, Record<UserPlan, string>> = {
  ar: { free: "مجاني", pro: "برو", plus: "بلس" },
  en: { free: "Free", pro: "Pro", plus: "Plus" },
};

export function parsePlusEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerPlusEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (OWNER_PLUS_EMAILS as readonly string[]).includes(
    email.trim().toLowerCase(),
  );
}

export function normalizeUserPlan(value: unknown): UserPlan {
  if (value === "plus" || value === "pro") return value;
  return "free";
}

/**
 * Resolve plan from role / allowlists (no PayPal yet).
 * member → free · creator → pro · editor/admin → plus
 */
export function resolveUserPlan(opts: {
  email?: string | null;
  role?: UserRole | null;
  cloudPlan?: UserPlan | null;
  plusEmails?: string[];
}): UserPlan {
  const email = opts.email?.trim().toLowerCase() ?? "";
  if (isOwnerPlusEmail(email) || isSuperAdminEmail(email)) return "plus";
  if (opts.role === "admin" || opts.role === "editor") return "plus";
  if (opts.role === "creator") return "pro";

  if (opts.cloudPlan === "plus" || opts.cloudPlan === "pro") {
    return opts.cloudPlan;
  }

  const allow =
    opts.plusEmails ?? parsePlusEmails(process.env.ARABYA_PLUS_EMAILS);
  if (email && allow.includes(email)) return "plus";
  return "free";
}

export function planLabel(plan: UserPlan, locale: AppLocale = "ar"): string {
  return PLAN_LABELS[locale][plan] ?? PLAN_LABELS.ar.free;
}

export function canCreateBasicImage(plan: UserPlan): boolean {
  return plan === "free" || plan === "pro" || plan === "plus";
}

export function canCreatePremiumImage(plan: UserPlan): boolean {
  return plan === "pro" || plan === "plus";
}

export function canCreateVideo(plan: UserPlan): boolean {
  return plan === "pro" || plan === "plus";
}

/** Logged-in users can export studio video; members get required brand + daily cap. */
export function canExportStudioMp4(_plan: UserPlan): boolean {
  return true;
}

/**
 * Member (free) must export with Arabya brand lockup.
 * Creator (pro) / editor (plus) / admin — may omit.
 */
export function studioExportNeedsWatermark(
  planOrOpts:
    | UserPlan
    | {
        plan?: UserPlan;
        role?: UserRole | null;
        email?: string | null;
      },
): boolean {
  if (typeof planOrOpts === "string") {
    return planOrOpts === "free";
  }
  if (canExportStudioWithoutBrand(planOrOpts.role ?? null, planOrOpts.email)) {
    return false;
  }
  if (planOrOpts.plan === "plus" || planOrOpts.plan === "pro") return false;
  return true;
}

/** Max ayah span for member (free) exports. */
export const STUDIO_MAX_AYAHS = 40;

export function canExportUnlimitedStudioAyahs(
  role?: UserRole | null,
  email?: string | null,
): boolean {
  return roleCanExportUnlimitedAyahs(role, email);
}

export type ImageAspect = "1:1" | "9:16" | "16:9";

export const FREE_IMAGE_ASPECT: ImageAspect = "1:1";

export const PLUS_IMAGE_ASPECTS: ImageAspect[] = ["1:1", "9:16", "16:9"];

export function imageSizeForAspect(aspect: ImageAspect): {
  width: number;
  height: number;
} {
  switch (aspect) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1920, height: 1080 };
    default:
      return { width: 1080, height: 1080 };
  }
}
