import { getSuperAdminEnvDiagnostics } from "@/lib/roles";

type Props = {
  sessionEmail?: string | null;
  labels: {
    title: string;
    count: string;
    yoursInList: string;
    yoursMissing: string;
    notConfigured: string;
    crmGateNote: string;
    reLoginHint: string;
  };
};

/** Shows safe super-admin allowlist diagnostics (no raw emails). */
export function AdminSuperAdminDiagnostics({ sessionEmail, labels }: Props) {
  const diag = getSuperAdminEnvDiagnostics(sessionEmail);

  return (
    <div className="dash-muted mt-4 space-y-2 text-sm leading-relaxed">
      <p className="font-medium text-[var(--ink)]">{labels.title}</p>
      {!diag.configured ? (
        <p>{labels.notConfigured}</p>
      ) : (
        <p>
          {labels.count
            .replace("{count}", String(diag.configuredCount))
            .replace("{env}", String(diag.envCount))
            .replace("{ui}", String(diag.uiCount))}
        </p>
      )}
      {sessionEmail ? (
        <p>
          {diag.currentEmailInList ? labels.yoursInList : labels.yoursMissing}
        </p>
      ) : null}
      <p>{labels.crmGateNote}</p>
      {!diag.currentEmailInList && diag.configured ? (
        <p>{labels.reLoginHint}</p>
      ) : null}
    </div>
  );
}
