"use client";

import { stageLabelAr } from "@/lib/lughawi/engine/stages-meta";
import type { EngineStageTrace } from "@/lib/lughawi/types";
import { Cloud, Cpu, Loader2, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  instantScanning: boolean;
  instantCount: number;
  deepPending: boolean;
  deepStages?: EngineStageTrace[];
  usedAi?: boolean;
  instantActive: boolean;
  learningActive?: number;
  learningEvents?: number;
};

export function LughawiLayerStrip({
  instantScanning,
  instantCount,
  deepPending,
  deepStages,
  usedAi,
  instantActive,
  learningActive = 0,
  learningEvents = 0,
}: Props) {
  const t = useTranslations("Lughawi");

  const runtimeStages =
    deepStages?.filter(
      (s) =>
        s.id === "arabya-nlp" ||
        s.id === "sidecar-nlp" ||
        s.id === "lughawi-neural" ||
        s.id.startsWith("ai"),
    ) ?? [];

  return (
    <div className="lughawi-layer-strip" role="status" aria-live="polite">
      <span className="lughawi-layer-strip-label">{t("layerStripTitle")}</span>

      {instantActive ? (
        <span
          className={`lughawi-layer-pill lughawi-layer-pill--instant${instantScanning ? " is-pulse" : ""}`}
        >
          {instantScanning ? (
            <Loader2 className="lughawi-ico lughawi-ico--spin" aria-hidden />
          ) : (
            <Zap className="lughawi-ico" aria-hidden />
          )}
          {instantScanning
            ? t("layerInstantScanning")
            : t("layerInstantCount", { count: instantCount })}
        </span>
      ) : null}

      <span className="lughawi-layer-pill lughawi-layer-pill--learn">
        <Sparkles className="lughawi-ico" aria-hidden />
        {t("layerLearn", {
          active: learningActive,
          events: learningEvents,
        })}
      </span>

      <span
        className={`lughawi-layer-pill lughawi-layer-pill--rules${deepPending ? " is-active" : ""}`}
      >
        <Cpu className="lughawi-ico" aria-hidden />
        {deepPending ? t("layerDeepRunning") : t("layerRulesReady")}
      </span>

      {runtimeStages.map((s) => (
        <span key={`${s.id}-${s.ms}`} className="lughawi-layer-pill lughawi-layer-pill--nlp">
          <Sparkles className="lughawi-ico" aria-hidden />
          {stageLabelAr(s.id)}
          {s.editCount > 0 ? ` · ${s.editCount}` : ""}
        </span>
      ))}

      {usedAi ? (
        <span className="lughawi-layer-pill lughawi-layer-pill--cloud">
          <Cloud className="lughawi-ico" aria-hidden />
          {t("layerCloudAi")}
        </span>
      ) : null}
    </div>
  );
}
