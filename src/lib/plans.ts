import { isEnvAdminEmail, type UserRole } from "@/lib/roles";

export type UserPlan = "free" | "plus";

export type AppLocale = "ar" | "en";

const PLAN_LABELS: Record<AppLocale, Record<UserPlan, string>> = {
  ar: { free: "مجاني", plus: "بلس" },
  en: { free: "Free", plus: "Plus" },
};

export function parsePlusEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeUserPlan(value: unknown): UserPlan {
  return value === "plus" ? "plus" : "free";
}

/**
 * Resolve billing plan without Stripe/PayPal yet.
 * Order: explicit cloud plan → Plus email allowlist → admin/editor roles → free.
 */
export function resolveUserPlan(opts: {
  email?: string | null;
  role?: UserRole | null;
  cloudPlan?: UserPlan | null;
  plusEmails?: string[];
}): UserPlan {
  if (opts.cloudPlan === "plus" || opts.cloudPlan === "free") {
    if (opts.cloudPlan === "plus") return "plus";
  }
  const email = opts.email?.trim().toLowerCase() ?? "";
  const allow = opts.plusEmails ?? parsePlusEmails(process.env.ARABYA_PLUS_EMAILS);
  if (email && allow.includes(email)) return "plus";
  if (opts.role === "admin" || opts.role === "editor") return "plus";
  if (email && isEnvAdminEmail(email)) return "plus";
  return "free";
}

export function planLabel(plan: UserPlan, locale: AppLocale = "ar"): string {
  return PLAN_LABELS[locale][plan] ?? PLAN_LABELS.ar.free;
}

export function canCreateBasicImage(plan: UserPlan): boolean {
  return plan === "free" || plan === "plus";
}

export function canCreatePremiumImage(plan: UserPlan): boolean {
  return plan === "plus";
}

export function canCreateVideo(plan: UserPlan): boolean {
  return plan === "plus";
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
