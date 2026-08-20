"use client";

import { ENGINE_STAGES } from "@/lib/lughawi/engine/core";
import type { EditType, LughawiEdit, ProofreadResponse, TashkeelLevel } from "@/lib/lughawi/types";
import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { LughawiSettings } from "@/components/lughawi/LughawiSettings";

type Action = "proofread" | "rewrite" | "translate" | "tashkeel" | "tafqeet";

const SAMPLES = [
  "انا ذهبت الى المدرسه ، وكتبت الرساله? هناك يوجد مشكله في النص",
  "يجب ان نراجع هذا المدرسة قبل ان ننشر الصفحه",
  "لم يكتبون التقرير كاملا؛ قالو انهم سينتهون غدا",
] as const;

const TYPE_CLASS: Record<EditType, string> = {
  spelling: "spelling",
  grammar: "grammar",
  morphology: "morphology",
  punctuation: "punctuation",
  style: "style",
  tashkeel: "tashkeel",
  other: "other",
};

export function LughawiStudio() {
  const t = useTranslations("Lughawi");
  const studioId = useId();
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
  const [showTrace, setShowTrace] = useState(false);
  const [copied, setCopied] = useState(false);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [poolCount, setPoolCount] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  const edits = result?.edits.filter((e) => e.status === "proposed") ?? [];

  useEffect(() => {
    void fetch("/api/lughawi/status")
      .then((r) => r.json())
      .then((j: { engine?: { version?: string }; projectPoolCount?: number }) => {
        if (j.engine?.version) setEngineVersion(j.engine.version);
        setPoolCount(j.projectPoolCount ?? 0);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 4200);
    return () => window.clearTimeout(id);
  }, [flash]);

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
          id={`${studioId}-mark-${edit.id}`}
          className={`lughawi-mark lughawi-mark--${TYPE_CLASS[edit.type]}${hoverId === edit.id ? " is-active" : ""}`}
          onMouseEnter={() => setHoverId(edit.id)}
          onMouseLeave={() => setHoverId(null)}
          onFocus={() => setHoverId(edit.id)}
          onBlur={() => setHoverId(null)}
          onClick={() => {
            setHoverId(edit.id);
            document
              .getElementById(`${studioId}-edit-${edit.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
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
  }, [result, edits, hoverId, studioId]);

  const run = useCallback(
    (next: Action) => {
      setAction(next);
      setError(null);
      setFlash(null);
      setCopied(false);
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
          if (next === "proofread" && json.edits?.length) {
            setResult({
              ...json,
              result: json.original,
              edits: json.edits.map((e) => ({ ...e, status: "proposed" })),
            });
          } else {
            setResult(json);
          }
          if (next === "proofread" && (!json.edits || json.edits.length === 0)) {
            setFlash(t("noEditsFlash"));
          }
        } catch {
          setError(t("errorGeneric"));
        }
      });
    },
    [t, text, targetLang, tashkeelLevel],
  );

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

      setHistory((h) => [...h.slice(-19), prev.result]);
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
    setHistory((h) => [...h.slice(-19), result.result]);
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

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      setText(prev);
      setResult(null);
      setFlash(t("undoFlash"));
      return h.slice(0, -1);
    });
  }

  function clearAll() {
    setText("");
    setResult(null);
    setError(null);
    setFlash(null);
  }

  function copyResult() {
    const value = result?.result ?? text;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  function onTextKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (text.trim() && !pending) run("proofread");
    }
  }

  function typeLabel(type: EditType): string {
    return t(`editType.${TYPE_CLASS[type]}` as "editType.spelling");
  }

  return (
    <section className="lughawi-studio" aria-label={t("studioLabel")}>
      <div className="lughawi-status-bar">
        <p className="lughawi-mode-pill" role="status">
          {t("offlineMode")}
          {engineVersion ? (
            <span className="lughawi-engine-ver">
              {t("engineVersion", { version: engineVersion })}
            </span>
          ) : null}
        </p>
        {poolCount > 0 ? (
          <p className="lughawi-mode-pill lughawi-mode-pill--soft">{t("autoReady")}</p>
        ) : null}
      </div>

      <div className="lughawi-toolbar" role="toolbar" aria-label={t("studioLabel")}>
        <button
          type="button"
          className={action === "proofread" ? "is-active lughawi-primary" : "lughawi-primary"}
          onClick={() => run("proofread")}
          disabled={pending || !text.trim()}
        >
          {pending && action === "proofread" ? t("processing") : t("actionCorrect")}
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
          aria-expanded={showSettings}
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

      {!text && !result ? (
        <div className="lughawi-samples" aria-label={t("samplesLabel")}>
          <span className="lughawi-samples-label">{t("trySample")}</span>
          {SAMPLES.map((sample, i) => (
            <button
              key={i}
              type="button"
              className="lughawi-sample-chip"
              onClick={() => {
                setText(sample);
                setResult(null);
              }}
            >
              {t("sampleN", { n: i + 1 })}
            </button>
          ))}
        </div>
      ) : null}

      <div className="lughawi-grid">
        <label className="lughawi-panel">
          <span className="lughawi-panel-label">
            {t("inputLabel")}
            <span className="lughawi-panel-tools">
              <span className="lughawi-count">
                {text.length.toLocaleString("ar-EG")} {t("chars")}
              </span>
              {history.length > 0 ? (
                <button type="button" className="lughawi-copy" onClick={undo}>
                  {t("undo")}
                </button>
              ) : null}
              <button
                type="button"
                className="lughawi-copy"
                onClick={clearAll}
                disabled={!text && !result}
              >
                {t("clear")}
              </button>
            </span>
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onTextKeyDown}
            rows={12}
            placeholder={t("placeholder")}
            dir="rtl"
            spellCheck={false}
            aria-describedby={`${studioId}-hint`}
          />
          <span id={`${studioId}-hint`} className="lughawi-hint">
            {t("shortcutHint")}
          </span>
        </label>

        <div className="lughawi-panel lughawi-panel--out">
          <div className="lughawi-panel-label">
            {t("outputLabel")}
            <button
              type="button"
              className="lughawi-copy"
              onClick={copyResult}
              disabled={!result && !text}
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          {pending ? (
            <div className="lughawi-skeleton" aria-busy="true" aria-live="polite">
              <span />
              <span />
              <span />
              <p className="lughawi-status">{t("processing")}</p>
            </div>
          ) : null}
          {error ? <p className="lughawi-error" role="alert">{error}</p> : null}
          {flash ? <p className="lughawi-flash" role="status">{flash}</p> : null}
          {!pending && result ? (
            <>
              <div className="lughawi-result" dir="rtl">
                {highlighted}
              </div>
              {result.meta.stages && result.meta.stages.length > 0 ? (
                <div className="lughawi-trace">
                  <button
                    type="button"
                    className="lughawi-trace-toggle"
                    onClick={() => setShowTrace((v) => !v)}
                    aria-expanded={showTrace}
                  >
                    {t("engineTrace", {
                      count: edits.length,
                      ms: result.meta.totalMs ?? 0,
                    })}
                  </button>
                  {showTrace ? (
                    <ul>
                      {result.meta.stages.map((s) => {
                        const label =
                          ENGINE_STAGES.find((st) => st.id === s.id)?.labelAr ??
                          s.id;
                        return (
                          <li key={`${s.id}-${s.ms}`}>
                            <span>{label}</span>
                            <span>
                              {s.editCount} {t("traceEdits")} · {s.ms} {t("traceMs")}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ) : null}
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
          ) : null}
          {!pending && !result ? (
            <p className="lughawi-muted lughawi-empty">{t("outputEmpty")}</p>
          ) : null}
        </div>
      </div>

      {edits.length > 0 ? (
        <div className="lughawi-edits">
          <div className="lughawi-edits-head">
            <h2>
              {t("editsTitle")}
              <span className="lughawi-edits-count">{edits.length}</span>
            </h2>
            <button type="button" className="lughawi-primary" onClick={acceptAll}>
              {t("acceptAll")}
            </button>
          </div>
          <ul>
            {edits.map((edit) => (
              <li
                key={edit.id}
                id={`${studioId}-edit-${edit.id}`}
                className={hoverId === edit.id ? "is-active" : undefined}
                onMouseEnter={() => setHoverId(edit.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div className="lughawi-edit-body">
                  <div className="lughawi-edit-meta">
                    <span className={`lughawi-type lughawi-type--${TYPE_CLASS[edit.type]}`}>
                      {typeLabel(edit.type)}
                    </span>
                    <span className="lughawi-conf">
                      {Math.round(edit.confidence * 100)}%
                    </span>
                  </div>
                  <div className="lughawi-edit-pair">
                    <code>{edit.original}</code>
                    <span className="lughawi-arrow" aria-hidden="true">
                      ←
                    </span>
                    <strong>{edit.suggestion}</strong>
                  </div>
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
                    className="lughawi-reject"
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
