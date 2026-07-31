"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { RECITERS, reciterDisplayName } from "@/lib/audio";
import {
  downloadBlob,
  exportProjectToVideo,
  supportsWebCodecsExport,
  type CreateVideoProject,
} from "@/lib/media-export/video-export";
import {
  canCreateVideo,
  PLUS_IMAGE_ASPECTS,
  type ImageAspect,
  type UserPlan,
} from "@/lib/plans";

export function CreateVideoClient({
  plan,
  surahs,
  initialSurah,
  initialVerse,
}: {
  plan: UserPlan;
  surahs: { id: number; name: string; versesCount: number }[];
  initialSurah: number;
  initialVerse: number;
}) {
  const t = useTranslations("Create");
  const locale = useLocale();
  const plus = canCreateVideo(plan);
  const [surahId, setSurahId] = useState(initialSurah);
  const [from, setFrom] = useState(initialVerse);
  const [to, setTo] = useState(initialVerse);
  const [reciterId, setReciterId] = useState(RECITERS[0].id);
  const [ratio, setRatio] = useState<ImageAspect>("9:16");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const maxVerse =
    surahs.find((s) => s.id === surahId)?.versesCount ?? initialVerse;
  const surahName =
    surahs.find((s) => s.id === surahId)?.name ?? String(surahId);

  if (!plus) {
    return (
      <div className="create-upsell-block">
        <p>{t("videoPlusOnly")}</p>
        <Link href="/pricing" className="auth-btn auth-btn--google">
          {t("seePricing")}
        </Link>
        <p className="dash-muted">{t("videoSafariNote")}</p>
      </div>
    );
  }

  if (!supportsWebCodecsExport()) {
    return (
      <div className="create-upsell-block">
        <p>{t("webcodecsUnsupported")}</p>
        <Link href="/create/image" className="nav-pill">
          {t("imageTitle")}
        </Link>
      </div>
    );
  }

  async function exportVideo() {
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const res = await fetch(
        `/api/create/ayahs?s=${surahId}&from=${start}&to=${end}`,
      );
      if (res.status === 403) {
        setError(t("plusRequired"));
        return;
      }
      if (!res.ok) {
        setError(t("exportFailed"));
        return;
      }
      const data = (await res.json()) as { ayahs: Record<number, string> };
      const project: CreateVideoProject = {
        surahId,
        surahName,
        ayahStart: start,
        ayahEnd: end,
        ayahTexts: data.ayahs,
        reciterId,
        ratio,
        quality: "high",
        textColor: "#f8fafc",
        overlayOpacity: 45,
        overlayPosition: "center",
        fontSize: 48,
        visualizer: "bars",
        locale,
      };
      const blob = await exportProjectToVideo({
        project,
        onProgress: (pct) => {
          setProgress(pct);
          setStatus(t("exportingVideo"));
        },
      });
      downloadBlob(blob, `arabya-${surahId}-${start}-${end}.mp4`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg === "webcodecs_unsupported"
          ? t("webcodecsUnsupported")
          : t("exportFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-studio">
      <p className="create-plan-badge">{t("planLabel", { plan: t("planPlus") })}</p>
      <div className="create-controls create-controls--wide">
        <label>
          {t("surah")}
          <select
            value={surahId}
            onChange={(e) => {
              setSurahId(Number(e.target.value));
              setFrom(1);
              setTo(1);
            }}
          >
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("fromVerse")}
          <input
            type="number"
            min={1}
            max={maxVerse}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value) || 1)}
          />
        </label>
        <label>
          {t("toVerse")}
          <input
            type="number"
            min={1}
            max={maxVerse}
            value={to}
            onChange={(e) => setTo(Number(e.target.value) || 1)}
          />
        </label>
        <label>
          {t("reciter")}
          <select
            value={reciterId}
            onChange={(e) => setReciterId(e.target.value)}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {reciterDisplayName(r, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("aspect")}
          <select
            value={ratio}
            onChange={(e) => setRatio(e.target.value as ImageAspect)}
          >
            {PLUS_IMAGE_ASPECTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void exportVideo()}
        >
          {busy ? t("exportingVideo") : t("downloadMp4")}
        </button>
        {busy ? (
          <p className="create-progress" aria-live="polite">
            {progress}% {status}
          </p>
        ) : null}
        {error ? <p className="create-error">{error}</p> : null}
        <p className="dash-muted">{t("videoRangeHint")}</p>
      </div>
    </div>
  );
}
