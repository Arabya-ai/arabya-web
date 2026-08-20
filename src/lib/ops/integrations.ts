/** Load Arabya/Lughawi external integrations registry (Git-first JSON). */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type IntegrationStatus =
  | "wired"
  | "wired_sidecar"
  | "optional_sidecar"
  | "optional_local"
  | "planned_sidecar"
  | "research_only"
  | "deferred";

export interface IntegrationEntry {
  id: string;
  nameAr: string;
  nameEn: string;
  role: string;
  license: string;
  repo: string;
  docs?: string;
  features: string[];
  status: IntegrationStatus;
  lughawiStage?: string;
  watch?: boolean;
  checkUrl?: string | null;
  hfModels?: string[];
  notesAr?: string;
}

export interface IntegrationsRegistry {
  version: number;
  updatedAt: string;
  noteAr?: string;
  integrations: IntegrationEntry[];
  competitors?: Array<{
    id: string;
    nameAr: string;
    url?: string;
    parityDoc?: string | null;
    notesAr?: string;
  }>;
}

function registryPath(): string {
  return join(process.cwd(), "data/ops/integrations-registry.json");
}

export function loadIntegrationsRegistry(): IntegrationsRegistry {
  const path = registryPath();
  if (!existsSync(path)) {
    return {
      version: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      integrations: [],
    };
  }
  return JSON.parse(readFileSync(path, "utf8")) as IntegrationsRegistry;
}

export async function probeUrl(
  url: string,
  timeoutMs = 2500,
): Promise<{ ok: boolean; ms: number; detail?: string }> {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    return {
      ok: res.ok,
      ms: Date.now() - started,
      detail: `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - started,
      detail: e instanceof Error ? e.message.slice(0, 120) : "probe_failed",
    };
  }
}
