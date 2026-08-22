import type { ReactNode } from "react";
import { canAccessAdmin, canAccessEditorialTools, getSuperAdminEnvDiagnostics, type UserRole } from "@/lib/roles";

type Props = {
  role: UserRole;
  sessionEmail?: string | null;
  labels: {
    title: string;
    editorNote: string;
    envMissing: string;
    reLoginHint: string;
  };
};

/**
 * Explains why CRM (/admin) may be hidden — super-admin allowlist is Contabo `.env` only.
 */
export function AdminCrmAccessHint({ role, sessionEmail, labels }: Props) {
  if (canAccessAdmin(role)) return null;
  if (!canAccessEditorialTools(role)) return null;

  const diag = getSuperAdminEnvDiagnostics(sessionEmail);

  return (
    <ArabyaPanelHint title={labels.title}>
      <p>{labels.editorNote}</p>
      {!diag.configured ? <p>{labels.envMissing}</p> : null}
      {diag.currentEmailInList && !canAccessAdmin(role) ? (
        <p>{labels.reLoginHint}</p>
      ) : null}
    </ArabyaPanelHint>
  );
}

function ArabyaPanelHint({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--ink-muted)]"
      role="note"
    >
      <p className="mb-2 font-medium text-[var(--ink)]">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
