"use client";

import type { LughawiEdit, ProofreadResponse, TashkeelLevel } from "@/lib/lughawi/types";
import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { LughawiSettings } from "@/components/lughawi/LughawiSettings";

type Action = "proofread" | "rewrite" | "translate" | "tashkeel" | "tafqeet";

export function LughawiStudio() {
  const t = useTranslations("Lughawi");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ProofreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<Action>("proofread");
  const [tashkeelLevel, setTashkeelLevel] = useState<TashkeelLevel>("full");
  const [targetLang, setTargetLang] = useState("en");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const edits = useMemo(
    () => result?.edits.filter((e) => e.status === "proposed") ?? [],
    [result],
  );

  const highlighted = useMemo(() => {
    if (!result) return null;
    const src = result.result;
    const sorted = [...edits]
      .filter((e) => e.end > e.start)
      .sort((a, b) => a.start - b.start);
    if (sorted.length === 0) return src;
    const nodes: ReactNode[] = [];
    let cursor = 0;
    sorted.forEach((edit, i) => {
      if (edit.start < cursor) return;
      if (edit.start > cursor) {
        nodes.push(
          <span key={`t-${i}`}>{src.slice(cursor, edit.start)}</span>,
        );
      }
      nodes.push(
        <mark
          key={edit.id}
          className={`lughawi-mark lughawi-mark--${edit.type}${hoverId === edit.id ? " is-active" : ""}`}
          onMouseEnter={() => setHoverId(edit.id)}
          onMouseLeave={() => setHoverId(null)}
          onFocus={() => setHoverId(edit.id)}
          onBlur={() => setHoverId(null)}
          tabIndex={0}
        >
          {src.slice(edit.start, edit.end)}
          {hoverId === edit.id ? (
            <span className="lughawi-tip" role="tooltip">
              <strong>{edit.suggestion}</strong>
              <span>{edit.explanation}</span>
            </span>
          ) : null}
        </mark>,
      );
      cursor = edit.end;
    });
    if (cursor < src.length) nodes.push(<span key="tail">{src.slice(cursor)}</span>);
    return nodes;
  }, [result, edits, hoverId]);

  function run(next: Action) {
    setAction(next);
    setError(null);
    setFlash(null);
    startTransition(async () => {
      try {
        const endpoint =
          next === "proofread"
            ? "/api/lughawi/proofread"
            : next === "rewrite"
              ? "/api/lughawi/rewrite"
              : next === "translate"
                ? "/api/lughawi/translate"
                : next === "tashkeel"
                  ? "/api/lughawi/tashkeel"
                  : "/api/lughawi/tafqeet";
        const body: Record<string, unknown> = { text, locale: "ar" };
        if (next === "rewrite") body.style = "fusha";
        if (next === "translate") body.targetLang = targetLang;
        if (next === "tashkeel") {
          body.level = tashkeelLevel;
          body.useAi = true;
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as ProofreadResponse & {
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          setError(json.error || t("errorGeneric"));
          return;
        }
        // For proofread: highlight on the *unfixed* original so marks align.
        // Keep result.result as fully applied preview; edits refer to original.
        if (next === "proofread" && json.edits?.length) {
          setResult({
            ...json,
            result: json.original,
            edits: json.edits.map((e) => ({ ...e, status: "proposed" })),
          });
        } else {
          setResult(json);
        }
      } catch {
        setError(t("errorGeneric"));
      }
    });
  }

  async function sendFeedback(edit: LughawiEdit, decision: "accepted" | "rejected") {
    try {
      await fetch("/api/lughawi/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: edit.original,
          to: edit.suggestion,
          decision,
          ruleId: edit.ruleId,
        }),
      });
    } catch {
      // Learning is best-effort; UI still applies locally.
    }
  }

  function decide(id: string, decision: "accepted" | "rejected") {
    setResult((prev) => {
      if (!prev) return prev;
      const edit = prev.edits.find((e) => e.id === id && e.status === "proposed");
      if (!edit) return prev;

      void sendFeedback(edit, decision);

      if (decision === "rejected") {
        setFlash(t("rejectedFlash", { word: edit.original }));
        return {
          ...prev,
          edits: prev.edits.filter((e) => e.id !== id),
        };
      }

      const applied = applySingleEdit(prev.result, prev.edits, id, "accepted");
      setText(applied.text);
      setFlash(t("acceptedFlash", { from: edit.original, to: edit.suggestion }));
      return {
        ...prev,
        original: applied.text,
        result: applied.text,
        edits: applied.edits,
      };
    });
  }

  function acceptAll() {
    if (!result) return;
    const pendingEdits = result.edits.filter((e) => e.status === "proposed");
    let workingText = result.result;
    let workingEdits = [...result.edits];
    for (const edit of pendingEdits) {
      void sendFeedback(edit, "accepted");
      const applied = applySingleEdit(workingText, workingEdits, edit.id, "accepted");
      workingText = applied.text;
      workingEdits = applied.edits;
    }
    setText(workingText);
    setResult({
      ...result,
      original: workingText,
      result: workingText,
      edits: [],
    });
    setFlash(t("acceptedAllFlash"));
  }

  function copyResult() {
    const value = result?.result ?? text;
    void navigator.clipboard.writeText(value);
  }

  return (
    <section className="lughawi-studio" aria-label={t("studioLabel")}>
      <p className="lughawi-mode-pill" role="status">
        {t("offlineMode")}
      </p>

      <div className="lughawi-toolbar">
        <button
          type="button"
          className={action === "proofread" ? "is-active" : undefined}
          onClick={() => run("proofread")}
          disabled={pending || !text.trim()}
        >
          {t("actionCorrect")}
        </button>
        <button
          type="button"
          className={action === "rewrite" ? "is-active" : undefined}
          onClick={() => run("rewrite")}
          disabled={pending || !text.trim()}
        >
          {t("actionRewrite")}
        </button>
        <button
          type="button"
          className={action === "translate" ? "is-active" : undefined}
          onClick={() => run("translate")}
          disabled={pending || !text.trim()}
        >
          {t("actionTranslate")}
        </button>
        <button
          type="button"
          className={action === "tashkeel" ? "is-active" : undefined}
          onClick={() => run("tashkeel")}
          disabled={pending || !text.trim()}
        >
          {t("actionTashkeel")}
        </button>
        <button
          type="button"
          className={action === "tafqeet" ? "is-active" : undefined}
          onClick={() => run("tafqeet")}
          disabled={pending || !text.trim()}
        >
          {t("actionTafqeet")}
        </button>
        <button
          type="button"
          className="lughawi-toolbar-ghost"
          onClick={() => setShowSettings((v) => !v)}
        >
          {t("settings")}
        </button>
      </div>

      {action === "tashkeel" ? (
        <div className="lughawi-subbar" role="group" aria-label={t("tashkeelModes")}>
          {(["full", "partial", "endings", "mandatory"] as TashkeelLevel[]).map(
            (level) => (
              <button
                key={level}
                type="button"
                className={tashkeelLevel === level ? "is-active" : undefined}
                onClick={() => setTashkeelLevel(level)}
              >
                {t(`tashkeel.${level}`)}
              </button>
            ),
          )}
        </div>
      ) : null}

      {action === "translate" ? (
        <div className="lughawi-subbar">
          <label>
            {t("targetLang")}
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="tr">Türkçe</option>
            </select>
          </label>
        </div>
      ) : null}

      {showSettings ? <LughawiSettings /> : null}

      <div className="lughawi-grid">
        <label className="lughawi-panel">
          <span className="lughawi-panel-label">
            {t("inputLabel")}
            <span className="lughawi-count">
              {text.length} {t("chars")}
            </span>
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={t("placeholder")}
            dir="rtl"
            spellCheck={false}
          />
        </label>

        <div className="lughawi-panel">
          <div className="lughawi-panel-label">
            {t("outputLabel")}
            <button type="button" className="lughawi-copy" onClick={copyResult} disabled={!result && !text}>
              {t("copy")}
            </button>
          </div>
          {pending ? <p className="lughawi-status">{t("processing")}</p> : null}
          {error ? <p className="lughawi-error">{error}</p> : null}
          {flash ? <p className="lughawi-flash" role="status">{flash}</p> : null}
          {result ? (
            <>
              <div className="lughawi-result" dir="rtl">
                {highlighted}
              </div>
              {result.meta.warning ? (
                <p className="lughawi-warn">{result.meta.warning}</p>
              ) : null}
              {result.protectedSpans.length > 0 ? (
                <ul className="lughawi-protected">
                  {result.protectedSpans.map((s, i) => (
                    <li key={`${s.start}-${i}`}>
                      {t("protectedQuran")}
                      {s.href ? (
                        <a href={s.href}>{t("openAyah")}</a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="lughawi-muted">{t("outputEmpty")}</p>
          )}
        </div>
      </div>

      {edits.length > 0 ? (
        <div className="lughawi-edits">
          <div className="lughawi-edits-head">
            <h2>{t("editsTitle")}</h2>
            <button type="button" onClick={acceptAll}>
              {t("acceptAll")}
            </button>
          </div>
          <ul>
            {edits.map((edit) => (
              <li key={edit.id}>
                <div>
                  <code>{edit.original}</code>
                  <span aria-hidden="true"> ← </span>
                  <strong>{edit.suggestion}</strong>
                  <p>{edit.explanation}</p>
                </div>
                <div className="lughawi-edit-actions">
                  <button
                    type="button"
                    data-edit-id={edit.id}
                    data-decision="accepted"
                    onClick={() => decide(edit.id, "accepted")}
                  >
                    {t("accept")}
                  </button>
                  <button
                    type="button"
                    data-edit-id={edit.id}
                    data-decision="rejected"
                    onClick={() => decide(edit.id, "rejected")}
                  >
                    {t("reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
