"use client";

import { AI_PROVIDERS, type AiProviderId } from "@/lib/lughawi/types";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

interface Quota {
  period: string;
  limitChars: number;
  usedChars: number;
  remainingChars: number;
}

interface ProviderRow {
  id: AiProviderId;
  label: string;
  configured: boolean;
  last4?: string;
  isDefault: boolean;
}

export function LughawiSettings() {
  const t = useTranslations("Lughawi");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [selected, setSelected] = useState<AiProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [authed, setAuthed] = useState(true);
  const [poolCount, setPoolCount] = useState(0);
  const [poolProviders, setPoolProviders] = useState<string[]>([]);

  function refresh() {
    startTransition(async () => {
      const [q, p] = await Promise.all([
        fetch("/api/lughawi/quota"),
        fetch("/api/lughawi/providers"),
      ]);
      if (q.status === 401 || p.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      if (q.ok) setQuota((await q.json()) as Quota);
      if (p.ok) {
        const data = (await p.json()) as {
          providers: ProviderRow[];
          defaultProvider: AiProviderId | null | "auto";
          projectPoolCount?: number;
          projectPoolProviders?: string[];
        };
        setProviders(data.providers);
        setPoolCount(data.projectPoolCount ?? 0);
        setPoolProviders(data.projectPoolProviders ?? []);
        if (data.defaultProvider && data.defaultProvider !== "auto") {
          setSelected(data.defaultProvider);
        }
      }
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  function saveKey() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/lughawi/providers/${selected}/key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const json = (await res.json()) as { error?: string; last4?: string };
      if (!res.ok) {
        setMessage(json.error || t("errorGeneric"));
        return;
      }
      setApiKey("");
      setMessage(t("keySaved", { last4: json.last4 ?? "" }));
      refresh();
    });
  }

  function removeKey(id: AiProviderId) {
    startTransition(async () => {
      await fetch(`/api/lughawi/providers/${id}/key`, { method: "DELETE" });
      refresh();
    });
  }

  if (!authed) {
    return (
      <div className="lughawi-settings">
        <p>{t("loginForQuota")}</p>
        <a href="/login" className="nav-pill">
          {t("login")}
        </a>
      </div>
    );
  }

  return (
    <div className="lughawi-settings">
      <h2>{t("settingsTitle")}</h2>
      <p className="lughawi-muted" style={{ margin: 0 }}>
        {t("autoModeHelp")}
      </p>
      {poolCount > 0 ? (
        <p className="lughawi-quota">
          {t("projectPoolLine", {
            count: poolCount,
            list: poolProviders.join(" · "),
          })}
        </p>
      ) : (
        <p className="lughawi-warn">{t("projectPoolEmpty")}</p>
      )}
      {quota ? (
        <p className="lughawi-quota">
          {t("quotaLine", {
            remaining: quota.remainingChars,
            limit: quota.limitChars,
            period: quota.period,
          })}
        </p>
      ) : null}

      <div className="lughawi-provider-form">
        <label>
          {t("provider")}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as AiProviderId)}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.labelAr}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("apiKey")}
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
          />
        </label>
        <button type="button" onClick={saveKey} disabled={pending || !apiKey.trim()}>
          {t("saveKey")}
        </button>
      </div>
      {message ? <p className="lughawi-status">{message}</p> : null}

      <ul className="lughawi-provider-list">
        {providers.map((p) => (
          <li key={p.id}>
            <span>
              {p.label}
              {p.configured ? ` · ••••${p.last4}` : ` · ${t("notConfigured")}`}
              {p.isDefault ? ` · ${t("default")}` : ""}
            </span>
            {p.configured ? (
              <button type="button" onClick={() => removeKey(p.id)} disabled={pending}>
                {t("removeKey")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <div>
        <h3 style={{ margin: "0.5rem 0 0.25rem", fontSize: "1rem" }}>
          {t("keysHelpTitle")}
        </h3>
        <p className="lughawi-muted" style={{ margin: 0 }}>
          {t("keysHelpBody")}
        </p>
      </div>
    </div>
  );
}
