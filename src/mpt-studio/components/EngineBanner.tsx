"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { mptGet, type MptHealth } from "@/mpt-studio/lib/client";

export function EngineBanner() {
  const t = useTranslations("StudioAi");
  const [health, setHealth] = useState<MptHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    void mptGet("/api/studio/ai/health").then(({ json }) => {
      if (cancelled || !json || typeof json !== "object") return;
      setHealth(json as MptHealth);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = !health
    ? "loading"
    : !health.configured
      ? "unconfigured"
      : health.online
        ? "online"
        : "offline";

  return (
    <div className="mpt-banner" data-state={state} role="status">
      <div>
        <strong>
          {state === "online"
            ? t("engineOn")
            : state === "unconfigured"
              ? t("engineUnconfigured")
              : state === "loading"
                ? t("engineChecking")
                : t("engineOff")}
        </strong>
        <p className="mpt-muted" style={{ margin: "0.25rem 0 0" }}>
          {state === "online"
            ? t("engineOnLead")
            : state === "unconfigured"
              ? t("engineUnconfiguredLead")
              : state === "loading"
                ? t("engineCheckingLead")
                : t("engineOffLead")}
        </p>
      </div>
    </div>
  );
}
