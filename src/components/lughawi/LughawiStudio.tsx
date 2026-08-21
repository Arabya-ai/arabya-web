"use client";

import { stageLabelAr } from "@/lib/lughawi/engine/stages-meta";
import { stripTashkeel } from "@/lib/lughawi/normalize";
import { findProtectedQuranSpans, searchKnownAyahs } from "@/lib/lughawi/quran-guard";
import type { EditType, LughawiEdit, ProofreadResponse, TashkeelLevel } from "@/lib/lughawi/types";
import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import { LughawiSettings } from "@/components/lughawi/LughawiSettings";
import {
  ArrowLeftRight,
  BookOpen,
  Check,
  CheckCheck,
  ClipboardCopy,
  Eraser,
  FileText,
  FolderOpen,
  Languages,
  Loader2,
  Puzzle,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  SpellCheck2,
  TextCursorInput,
  WandSparkles,
  Hash,
  ShieldCheck,
  Zap,
  X,
  BookMarked,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type Action = "proofread" | "rewrite" | "translate" | "tashkeel" | "tafqeet";

type WorkspaceModule =
  | "editor"
  | "quran"
  | "tafqeetPanel"
  | "ocr"
  | "documents"
  | "translation"
  | "addons"
  | "plagiarism"
  | "style"
  | "dictionary"
  | "templates"
  | "settings";

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

const FILTER_TYPES: EditType[] = [
  "spelling",
  "grammar",
  "style",
  "morphology",
  "punctuation",
  "other",
];

const ALL_TYPES_ON: Record<EditType, boolean> = {
  spelling: true,
  grammar: true,
  morphology: true,
  punctuation: true,
  style: true,
  tashkeel: true,
  other: true,
};

export function LughawiStudio() {
  const t = useTranslations("Lughawi");
  const studioId = useId();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ProofreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  /** Explicit busy flag — do not use async startTransition (pending drops early). */
  const [pending, setPending] = useState(false);
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
  const [module, setModule] = useState<WorkspaceModule>("editor");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES_ON);
  const [proofMode, setProofMode] = useState<"full" | "spelling">("full");
  const [quranQuery, setQuranQuery] = useState("");
  const [quranHits, setQuranHits] = useState<
    ReturnType<typeof searchKnownAyahs>
  >([]);
  const [sttPending, setSttPending] = useState(false);

  const allEdits = useMemo(
    () => result?.edits.filter((e) => e.status === "proposed") ?? [],
    [result?.edits],
  );
  const edits = allEdits.filter((e) => {
    if (typeFilter[e.type] === false) return false;
    if (proofMode === "spelling") return e.type === "spelling";
    return true;
  });

  const editStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEdits) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }, [allEdits]);

  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [text]);

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
      if (pending) return;
      setAction(next);
      setError(null);
      setFlash(null);
      setCopied(false);
      setPending(true);
      void (async () => {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 90_000);
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
          if (next === "proofread") {
            body.proofMode = proofMode;
          }
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
            signal: ctrl.signal,
          });
          let json: ProofreadResponse & { error?: string; code?: string };
          try {
            json = (await res.json()) as typeof json;
          } catch {
            setError(
              res.ok ? t("errorGeneric") : t("errorProxy", { status: res.status }),
            );
            return;
          }
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
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            setError(t("errorTimeout"));
          } else {
            setError(t("errorGeneric"));
          }
        } finally {
          window.clearTimeout(timer);
          setPending(false);
        }
      })();
    },
    [t, text, targetLang, tashkeelLevel, proofMode, pending],
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
    const pendingEdits = result.edits.filter(
      (e) => e.status === "proposed" && typeFilter[e.type] !== false,
    );
    if (pendingEdits.length === 0) return;
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
      edits: workingEdits.filter((e) => e.status === "proposed"),
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

  function removeDiacritics() {
    const next = stripTashkeel(text);
    if (next === text) {
      setFlash(t("noTashkeelFlash"));
      return;
    }
    setHistory((h) => [...h.slice(-19), text]);
    setText(next);
    setResult(null);
    setFlash(t("removedTashkeelFlash"));
  }

  function checkVerses() {
    const spans = findProtectedQuranSpans(text);
    if (spans.length === 0) {
      setFlash(t("noVerseFlash"));
      return;
    }
    setFlash(t("verseFoundFlash", { count: spans.length }));
    if (!result) run("proofread");
  }

  function toggleType(type: EditType) {
    setTypeFilter((prev) => ({ ...prev, [type]: !prev[type] }));
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

  const actions: {
    id: Action;
    label: string;
    icon: ReactNode;
    primary?: boolean;
  }[] = [
    {
      id: "proofread",
      label: pending && action === "proofread" ? t("processing") : t("actionCorrect"),
      icon:
        pending && action === "proofread" ? (
          <Loader2 className="lughawi-ico lughawi-ico--spin" aria-hidden />
        ) : (
          <SpellCheck2 className="lughawi-ico" aria-hidden />
        ),
      primary: true,
    },
    {
      id: "rewrite",
      label: t("actionRewrite"),
      icon: <WandSparkles className="lughawi-ico" aria-hidden />,
    },
    {
      id: "translate",
      label: t("actionTranslate"),
      icon: <Languages className="lughawi-ico" aria-hidden />,
    },
    {
      id: "tashkeel",
      label: t("actionTashkeel"),
      icon: <Sparkles className="lughawi-ico" aria-hidden />,
    },
    {
      id: "tafqeet",
      label: t("actionTafqeet"),
      icon: <Hash className="lughawi-ico" aria-hidden />,
    },
  ];

  const modules: {
    id: WorkspaceModule;
    label: string;
    icon: ReactNode;
    soon?: boolean;
  }[] = [
    {
      id: "editor",
      label: t("module.correct"),
      icon: <SpellCheck2 className="lughawi-ico" aria-hidden />,
    },
    {
      id: "quran",
      label: t("module.quran"),
      icon: <BookOpen className="lughawi-ico" aria-hidden />,
    },
    {
      id: "tafqeetPanel",
      label: t("module.tafqeet"),
      icon: <Hash className="lughawi-ico" aria-hidden />,
    },
    {
      id: "translation",
      label: t("module.translation"),
      icon: <Languages className="lughawi-ico" aria-hidden />,
    },
    {
      id: "ocr",
      label: t("module.ocr"),
      icon: <FileText className="lughawi-ico" aria-hidden />,
    },
    {
      id: "documents",
      label: t("module.documents"),
      icon: <FolderOpen className="lughawi-ico" aria-hidden />,
      soon: true,
    },
    {
      id: "addons",
      label: t("module.addons"),
      icon: <Puzzle className="lughawi-ico" aria-hidden />,
      soon: true,
    },
    {
      id: "plagiarism",
      label: t("module.plagiarism"),
      icon: <Search className="lughawi-ico" aria-hidden />,
      soon: true,
    },
    {
      id: "style",
      label: t("module.style"),
      icon: <SlidersHorizontal className="lughawi-ico" aria-hidden />,
      soon: true,
    },
    {
      id: "dictionary",
      label: t("module.dictionary"),
      icon: <BookMarked className="lughawi-ico" aria-hidden />,
      soon: true,
    },
    {
      id: "templates",
      label: t("module.templates"),
      icon: <BookMarked className="lughawi-ico" aria-hidden />,
      soon: true,
    },
    {
      id: "settings",
      label: t("settings"),
      icon: <Settings2 className="lughawi-ico" aria-hidden />,
    },
  ];

  return (
    <section className="lughawi-studio" aria-label={t("studioLabel")}>
      <div className="lughawi-shell">
        <nav className="lughawi-rail lughawi-rail--nav" aria-label={t("modulesNav")}>
          {modules.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`lughawi-rail-btn${module === m.id ? " is-active" : ""}`}
              onClick={() => {
                setModule(m.id);
                if (m.id === "settings") setShowSettings(true);
                else setShowSettings(false);
                if (m.id === "translation") setAction("translate");
                if (m.id === "tafqeetPanel") setAction("tafqeet");
                if (m.id === "editor") setAction("proofread");
              }}
            >
              {m.icon}
              <span>{m.label}</span>
              {m.soon ? <span className="lughawi-rail-badge">{t("soon")}</span> : null}
            </button>
          ))}
        </nav>

        <div className="lughawi-main-col">
          {module === "quran" ? (
            <div className="lughawi-workspace">
              <h2 className="lughawi-panel-title">{t("module.quran")}</h2>
              <p className="lughawi-muted">{t("quranAssistHelp")}</p>
              <textarea
                value={quranQuery}
                onChange={(e) => setQuranQuery(e.target.value)}
                rows={4}
                placeholder={t("quranSearchPlaceholder")}
                dir="rtl"
              />
              <button
                type="button"
                className="lughawi-primary"
                onClick={() => setQuranHits(searchKnownAyahs(quranQuery))}
              >
                {t("quranSearch")}
              </button>
              <ul className="lughawi-protected">
                {quranHits.map((h) => (
                  <li key={`${h.surah}-${h.ayah}`}>
                    <strong>
                      {h.surah}:{h.ayah}
                    </strong>{" "}
                    {h.text}{" "}
                    <button
                      type="button"
                      className="lughawi-copy"
                      onClick={() => {
                        void navigator.clipboard.writeText(h.text);
                        setFlash(t("copied"));
                      }}
                    >
                      {t("copy")}
                    </button>{" "}
                    <a href={h.href}>{t("openAyah")}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : module === "ocr" ? (
            <div className="lughawi-workspace">
              <p className="lughawi-muted">{t("ocrHelp")}</p>
              <div className="lughawi-toolbar">
                <label className="lughawi-secondary">
                  <input
                    type="file"
                    accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.webm,.mp4"
                    disabled={sttPending || pending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setError(null);
                      setSttPending(true);
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = String(reader.result || "");
                        const b64 = dataUrl.includes(",")
                          ? dataUrl.split(",")[1] || ""
                          : dataUrl;
                        void fetch("/api/lughawi/transcribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            audioBase64: b64,
                            filename: file.name,
                          }),
                        })
                          .then(async (r) => {
                            const j = (await r.json()) as {
                              text?: string;
                              error?: string;
                              engine?: string;
                            };
                            if (!r.ok) {
                              throw new Error(j.error || t("ocrSttFailed"));
                            }
                            const extracted = (j.text || "").trim();
                            if (!extracted) {
                              throw new Error(t("ocrSttEmpty"));
                            }
                            setText(extracted);
                            setModule("editor");
                            setFlash(
                              t("ocrSttOk", {
                                engine: j.engine || "whisper",
                              }),
                            );
                            setAction("proofread");
                            setError(null);
                            setPending(true);
                            void (async () => {
                              const ctrl = new AbortController();
                              const timer = window.setTimeout(
                                () => ctrl.abort(),
                                90_000,
                              );
                              try {
                                const res = await fetch(
                                  "/api/lughawi/proofread",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      text: extracted,
                                      locale: "ar",
                                      proofMode,
                                    }),
                                    signal: ctrl.signal,
                                  },
                                );
                                let json: ProofreadResponse & {
                                  error?: string;
                                };
                                try {
                                  json = (await res.json()) as typeof json;
                                } catch {
                                  setError(
                                    res.ok
                                      ? t("errorGeneric")
                                      : t("errorProxy", { status: res.status }),
                                  );
                                  return;
                                }
                                if (!res.ok) {
                                  setError(json.error || t("errorGeneric"));
                                  return;
                                }
                                if (json.edits?.length) {
                                  setResult({
                                    ...json,
                                    result: json.original,
                                    edits: json.edits.map((e) => ({
                                      ...e,
                                      status: "proposed" as const,
                                    })),
                                  });
                                } else {
                                  setResult(json);
                                  setFlash(t("noEditsFlash"));
                                }
                              } catch (err: unknown) {
                                if (
                                  err instanceof DOMException &&
                                  err.name === "AbortError"
                                ) {
                                  setError(t("errorTimeout"));
                                } else {
                                  setError(t("errorGeneric"));
                                }
                              } finally {
                                window.clearTimeout(timer);
                                setPending(false);
                              }
                            })();
                          })
                          .catch((err: unknown) => {
                            setError(
                              err instanceof Error
                                ? err.message
                                : t("ocrSttFailed"),
                            );
                          })
                          .finally(() => setSttPending(false));
                      };
                      reader.onerror = () => {
                        setSttPending(false);
                        setError(t("ocrSttFailed"));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {sttPending ? t("ocrSttWorking") : t("ocrPickMedia")}
                </label>
              </div>
              <p className="lughawi-muted">{t("ocrImageSoon")}</p>
            </div>
          ) : module === "tafqeetPanel" ? (
            <div className="lughawi-workspace">
              <div className="lughawi-toolbar">
                <button
                  type="button"
                  className="lughawi-primary"
                  onClick={() => {
                    setModule("editor");
                    setAction("tafqeet");
                    if (text.trim()) run("tafqeet");
                  }}
                  disabled={pending || !text.trim()}
                >
                  <Hash className="lughawi-ico" aria-hidden />
                  {t("actionTafqeet")}
                </button>
              </div>
              <p className="lughawi-muted">{t("moduleComingSoon", { name: t("module.tafqeet") })}</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder={t("placeholder")}
                dir="rtl"
              />
            </div>
          ) : module !== "editor" &&
            module !== "settings" &&
            module !== "translation" ? (
            <div className="lughawi-module-placeholder">
              <p>
                {t("moduleComingSoon", {
                  name: t(`module.${module}` as "module.documents"),
                })}
              </p>
            </div>
          ) : (
            <div className="lughawi-workspace">
              <div className="lughawi-chrome">
                <div className="lughawi-status-bar">
                  <p className="lughawi-mode-pill" role="status">
                    <span>
                      {t("charLimitLabel")} {text.length.toLocaleString("ar-EG")}
                    </span>
                    <span>
                      {t("maxLabel")} {8000}
                    </span>
                  </p>
                  <p className="lughawi-mode-pill" role="status">
                    <ShieldCheck className="lughawi-ico" aria-hidden />
                    <span>{t("offlineMode")}</span>
                    {engineVersion ? (
                      <span className="lughawi-engine-ver">
                        {t("engineVersion", { version: engineVersion })}
                      </span>
                    ) : null}
                  </p>
                  {poolCount > 0 ? (
                    <p className="lughawi-mode-pill lughawi-mode-pill--soft">
                      <Zap className="lughawi-ico" aria-hidden />
                      {t("autoReady")}
                    </p>
                  ) : null}
                </div>

                <div
                  className="lughawi-subbar"
                  role="group"
                  aria-label={t("proofModeTitle")}
                >
                  <button
                    type="button"
                    className={proofMode === "full" ? "is-active" : undefined}
                    onClick={() => setProofMode("full")}
                  >
                    {t("proofModeFull")}
                  </button>
                  <button
                    type="button"
                    className={proofMode === "spelling" ? "is-active" : undefined}
                    onClick={() => setProofMode("spelling")}
                  >
                    {t("proofModeSpelling")}
                  </button>
                  <button
                    type="button"
                    className="lughawi-primary"
                    onClick={() => run("proofread")}
                    disabled={pending || !text.trim()}
                  >
                    {t("startCorrect")}
                  </button>
                </div>

                <div
                  className="lughawi-toolbar"
                  role="toolbar"
                  aria-label={t("studioLabel")}
                >
                  {actions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        item.primary ? "lughawi-primary" : "",
                        action === item.id ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => run(item.id)}
                      disabled={pending || !text.trim()}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <div className="lughawi-toolbar-meta">
                    <button
                      type="button"
                      onClick={checkVerses}
                      disabled={!text.trim()}
                      title={t("actionVerse")}
                    >
                      <BookOpen className="lughawi-ico" aria-hidden />
                      <span>{t("actionVerse")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={removeDiacritics}
                      disabled={!text.trim()}
                      title={t("actionStripTashkeel")}
                    >
                      <Eraser className="lughawi-ico" aria-hidden />
                      <span>{t("actionStripTashkeel")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings((v) => !v);
                        setModule("settings");
                      }}
                      aria-expanded={showSettings}
                    >
                      <Settings2 className="lughawi-ico" aria-hidden />
                      <span>{t("settings")}</span>
                    </button>
                  </div>
                </div>
              </div>

              {action === "tashkeel" ? (
                <div
                  className="lughawi-subbar"
                  role="group"
                  aria-label={t("tashkeelModes")}
                >
                  {(
                    ["full", "partial", "endings", "mandatory"] as TashkeelLevel[]
                  ).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={tashkeelLevel === level ? "is-active" : undefined}
                      onClick={() => setTashkeelLevel(level)}
                    >
                      {t(`tashkeel.${level}`)}
                    </button>
                  ))}
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
                  <span className="lughawi-samples-label">
                    <TextCursorInput className="lughawi-ico" aria-hidden />
                    {t("trySample")}
                  </span>
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

              {edits.length > 0 ? (
                <div className="lughawi-legend" aria-label={t("legendTitle")}>
                  <span className="lughawi-legend-title">{t("legendTitle")}</span>
                  {(
                    [
                      "spelling",
                      "grammar",
                      "style",
                      "morphology",
                      "punctuation",
                    ] as const
                  ).map((key) =>
                    editStats[key] ? (
                      <span
                        key={key}
                        className={`lughawi-legend-item lughawi-legend-item--${key}`}
                      >
                        {t(`editType.${key}`)} · {editStats[key]}
                      </span>
                    ) : null,
                  )}
                </div>
              ) : null}

              <div className="lughawi-grid">
                <label className="lughawi-panel">
                  <span className="lughawi-panel-label">
                    <span className="lughawi-panel-title">
                      <TextCursorInput className="lughawi-ico" aria-hidden />
                      {t("inputLabel")}
                    </span>
                    <span className="lughawi-panel-tools">
                      <span className="lughawi-count">
                        {text.length.toLocaleString("ar-EG")} {t("chars")}
                      </span>
                      {history.length > 0 ? (
                        <button type="button" className="lughawi-copy" onClick={undo}>
                          <RotateCcw className="lughawi-ico" aria-hidden />
                          {t("undo")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="lughawi-copy"
                        onClick={clearAll}
                        disabled={!text && !result}
                      >
                        <Eraser className="lughawi-ico" aria-hidden />
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
                    <span className="lughawi-panel-title">
                      <SpellCheck2 className="lughawi-ico" aria-hidden />
                      {t("outputLabel")}
                    </span>
                    <button
                      type="button"
                      className="lughawi-copy"
                      onClick={copyResult}
                      disabled={!result && !text}
                    >
                      {copied ? (
                        <Check className="lughawi-ico" aria-hidden />
                      ) : (
                        <ClipboardCopy className="lughawi-ico" aria-hidden />
                      )}
                      {copied ? t("copied") : t("copy")}
                    </button>
                  </div>
                  {pending ? (
                    <div
                      className="lughawi-skeleton"
                      aria-busy="true"
                      aria-live="polite"
                    >
                      <span />
                      <span />
                      <span />
                      <p className="lughawi-status">
                        <Loader2
                          className="lughawi-ico lughawi-ico--spin"
                          aria-hidden
                        />
                        {t("processing")}
                      </p>
                    </div>
                  ) : null}
                  {error ? (
                    <p className="lughawi-error" role="alert">
                      {error}
                    </p>
                  ) : null}
                  {flash ? (
                    <p className="lughawi-flash" role="status">
                      {flash}
                    </p>
                  ) : null}
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
                                const label = stageLabelAr(s.id);
                                return (
                                  <li key={`${s.id}-${s.ms}`}>
                                    <span>{label}</span>
                                    <span>
                                      {s.editCount} {t("traceEdits")} · {s.ms}{" "}
                                      {t("traceMs")}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      {result.meta.usedAi ? (
                        <p className="lughawi-flash" role="status">
                          {t("autoOk")}
                        </p>
                      ) : null}
                      {result.meta.warning ? (
                        <p className="lughawi-warn" role="status">
                          {result.meta.warning}
                        </p>
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
                    <div className="lughawi-empty">
                      <Sparkles className="lughawi-empty-ico" aria-hidden />
                      <p className="lughawi-muted">{t("outputEmpty")}</p>
                    </div>
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
                    <button
                      type="button"
                      className="lughawi-primary"
                      onClick={acceptAll}
                    >
                      <CheckCheck className="lughawi-ico" aria-hidden />
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
                            <span
                              className={`lughawi-type lughawi-type--${TYPE_CLASS[edit.type]}`}
                            >
                              {typeLabel(edit.type)}
                            </span>
                            <span className="lughawi-conf">
                              {Math.round(edit.confidence * 100)}%
                            </span>
                          </div>
                          <div className="lughawi-edit-pair">
                            <code>{edit.original}</code>
                            <ArrowLeftRight
                              className="lughawi-arrow-ico"
                              aria-hidden
                            />
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
                            <Check className="lughawi-ico" aria-hidden />
                            {t("accept")}
                          </button>
                          <button
                            type="button"
                            className="lughawi-reject"
                            data-edit-id={edit.id}
                            data-decision="rejected"
                            onClick={() => decide(edit.id, "rejected")}
                          >
                            <X className="lughawi-ico" aria-hidden />
                            {t("reject")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <aside className="lughawi-rail lughawi-rail--analysis" aria-label={t("analysisNav")}>
          <button
            type="button"
            className="lughawi-primary"
            onClick={acceptAll}
            disabled={edits.length === 0 || pending}
          >
            <CheckCheck className="lughawi-ico" aria-hidden />
            {t("correctAll")}
          </button>
          <ul className="lughawi-cat-list">
            {FILTER_TYPES.map((type) => (
              <li key={type}>
                <label>
                  <input
                    type="checkbox"
                    checked={typeFilter[type] !== false}
                    onChange={() => toggleType(type)}
                  />
                  <span className={`lughawi-cat-dot lughawi-cat-dot--${TYPE_CLASS[type]}`} />
                  <span>{typeLabel(type)}</span>
                </label>
                <span className="lughawi-cat-count">{editStats[type] ?? 0}</span>
              </li>
            ))}
          </ul>
          <div className="lughawi-wordcount">
            <span>
              {t("wordCount")}: {wordCount.toLocaleString("ar-EG")}
            </span>
            {allEdits.length > 0 ? (
              <span className="lughawi-error-badge" title={t("issuesCount")}>
                {allEdits.length}
              </span>
            ) : null}
          </div>
          {result?.meta.eloquence ? (
            <div className="lughawi-eloquence" title={result.meta.eloquence.summaryAr}>
              <span className="lughawi-eloquence-score">
                {t("eloquenceScore")}: {result.meta.eloquence.score}
              </span>
              <span className="lughawi-eloquence-note">{result.meta.eloquence.summaryAr}</span>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
