/** Build ops snapshot for super-admin monitoring (site-wide + Lughawi). */

import { lughawiProjectAiPoolSummary } from "@/lib/lughawi/config";
import { LUGHAWI_ENGINE_VERSION } from "@/lib/lughawi/engine/stages-meta";
import { learningStats } from "@/lib/lughawi/learning-store";
import { probeSidecarHealth } from "@/lib/lughawi/sidecar-client";
import {
  loadIntegrationsRegistry,
  probeUrl,
  type IntegrationEntry,
} from "@/lib/ops/integrations";
import { usageSummary } from "@/lib/ops/usage-meter";
import { isCloudSyncConfigured } from "@/lib/cloud-sync";

export interface OpsAlert {
  id: string;
  level: "info" | "warn" | "critical";
  area: string;
  messageAr: string;
  at: string;
}

export interface OpsSnapshot {
  generatedAt: string;
  site: {
    userSyncEnabled: boolean;
    nodeEnv: string;
  };
  lughawi: {
    engineVersion: string;
    projectPoolCount: number;
    projectPoolByProvider: Record<string, number>;
    hasLocalOllama: boolean;
    learning: ReturnType<typeof learningStats>;
    sidecar?: {
      ok: boolean;
      version?: string;
      tools?: Record<string, string>;
      ms: number;
      detail?: string;
    };
  };
  aiUsage: ReturnType<typeof usageSummary>;
  integrations: Array<
    IntegrationEntry & {
      health?: { ok: boolean; ms: number; detail?: string };
    }
  >;
  alerts: OpsAlert[];
}

export async function buildOpsSnapshot(): Promise<OpsSnapshot> {
  const now = new Date().toISOString();
  const alerts: OpsAlert[] = [];
  const registry = loadIntegrationsRegistry();
  const pool = lughawiProjectAiPoolSummary();
  const aiUsage = usageSummary();
  const sidecar = await probeSidecarHealth();

  for (const a of aiUsage.alerts) {
    alerts.push({
      id: `ai-${a.level}-${alerts.length}`,
      level: a.level,
      area: "ai-pool",
      messageAr: a.messageAr,
      at: now,
    });
  }

  if (pool.total === 0) {
    alerts.push({
      id: "ai-pool-empty",
      level: "warn",
      area: "ai-pool",
      messageAr:
        "مجمّع مفاتيح المشروع فارغ — أضف مفاتيح من تبويب «المفاتيح» أعلاه (بدون تعديل ملفات).",
      at: now,
    });
  }

  if (!pool.hasLocal) {
    alerts.push({
      id: "ollama-missing",
      level: "info",
      area: "local-ai",
      messageAr:
        "لم يُضبط Ollama المحلي بعد (LUGHAWI_OLLAMA_BASE_URL). أضفه لتقليل التكلفة عند نفاد المفاتيح.",
      at: now,
    });
  }

  if (!sidecar.ok) {
    alerts.push({
      id: "sidecar-down",
      level: "info",
      area: "sidecar",
      messageAr:
        "Sidecar لغوي غير متصل (127.0.0.1:8091). التدقيق المحلي يعمل؛ الصرف/التشكيل العصبي لاحقًا بعد تشغيله.",
      at: now,
    });
  }

  if (!isCloudSyncConfigured()) {
    alerts.push({
      id: "user-sync-off",
      level: "warn",
      area: "accounts",
      messageAr:
        "مزامنة الحسابات غير مفعّلة (ARABYA_USER_SYNC_ENABLED). CRM الإحصائيات قد تكون محدودة.",
      at: now,
    });
  }

  const integrations: OpsSnapshot["integrations"] = [];
  for (const entry of registry.integrations) {
    let health: { ok: boolean; ms: number; detail?: string } | undefined;
    if (entry.id === "lughawi-sidecar") {
      health = {
        ok: sidecar.ok,
        ms: sidecar.ms,
        detail: sidecar.ok
          ? `v${sidecar.version ?? "?"} · ${JSON.stringify(sidecar.tools ?? {})}`
          : sidecar.detail,
      };
    } else {
      const shouldProbe =
        Boolean(entry.checkUrl) &&
        (entry.id !== "ollama-local" || Boolean(process.env.LUGHAWI_OLLAMA_BASE_URL));
      if (shouldProbe && entry.checkUrl) {
        health = await probeUrl(entry.checkUrl);
        if (!health.ok && entry.status === "wired") {
          alerts.push({
            id: `health-${entry.id}`,
            level: "critical",
            area: "integrations",
            messageAr: `${entry.nameAr} لا يستجيب: ${health.detail ?? "فشل"}`,
            at: now,
          });
        }
      }
    }
    integrations.push({ ...entry, health });
  }

  const planned = integrations.filter((i) => i.status === "planned_sidecar");
  if (planned.length > 0) {
    alerts.push({
      id: "sidecar-backlog",
      level: "info",
      area: "integrations",
      messageAr: `${planned.length} أداة مفتوحة مخططة للـ sidecar (CAMeL / CATT / BAYAN / ARETA…).`,
      at: now,
    });
  }

  return {
    generatedAt: now,
    site: {
      userSyncEnabled: isCloudSyncConfigured(),
      nodeEnv: process.env.NODE_ENV ?? "development",
    },
    lughawi: {
      engineVersion: LUGHAWI_ENGINE_VERSION,
      projectPoolCount: pool.total,
      projectPoolByProvider: pool.byProvider,
      hasLocalOllama: pool.hasLocal,
      learning: learningStats(),
      sidecar: {
        ok: sidecar.ok,
        version: sidecar.version,
        tools: sidecar.tools,
        ms: sidecar.ms,
        detail: sidecar.detail,
      },
    },
    aiUsage,
    integrations,
    alerts,
  };
}
