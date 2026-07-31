"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  canCreatePremiumImage,
  FREE_IMAGE_ASPECT,
  PLUS_IMAGE_ASPECTS,
  type ImageAspect,
  type UserPlan,
} from "@/lib/plans";

type Edition = { slug: string; name: string };

export function CreateImageClient({
  plan,
  surahs,
  editions,
  initialSurah,
  initialVerse,
}: {
  plan: UserPlan;
  surahs: { id: number; name: string; versesCount: number }[];
  editions: Edition[];
  initialSurah: number;
  initialVerse: number;
}) {
  const t = useTranslations("Create");
  const locale = useLocale();
  const premium = canCreatePremiumImage(plan);
  const [surahId, setSurahId] = useState(initialSurah);
  const [verse, setVerse] = useState(initialVerse);
  const [aspect, setAspect] = useState<ImageAspect>(FREE_IMAGE_ASPECT);
  const [withTr, setWithTr] = useState(false);
  const [edition, setEdition] = useState(editions[0]?.slug ?? "");
  const [bg, setBg] = useState("#0f766e");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const maxVerse =
    surahs.find((s) => s.id === surahId)?.versesCount ?? initialVerse;

  const previewUrl = useMemo(() => {
    const sp = new URLSearchParams({
      s: String(surahId),
      v: String(Math.min(verse, maxVerse)),
      locale,
      aspect: premium ? aspect : FREE_IMAGE_ASPECT,
    });
    if (withTr && edition) {
      sp.set("tr", "1");
      sp.set("edition", edition);
    }
    if (premium && bg) sp.set("bg", bg);
    return `/api/create/image?${sp.toString()}`;
  }, [surahId, verse, maxVerse, locale, aspect, withTr, edition, bg, premium]);

  async function download() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(previewUrl);
      if (res.status === 403) {
        setError(t("plusRequired"));
        return;
      }
      if (!res.ok) {
        setError(t("exportFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arabya-${surahId}-${verse}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-studio">
      <p className="create-plan-badge">
        {t("planLabel", {
          plan:
            plan === "plus"
              ? t("planPlus")
              : plan === "pro"
                ? t("planPro")
                : t("planFree"),
        })}
      </p>
      {!premium ? (
        <p className="create-upsell">
          {t("freeLimits")}{" "}
          <Link href="/pricing">{t("seePricing")}</Link>
        </p>
      ) : null}

      <div className="create-grid">
        <div className="create-controls">
          <label>
            {t("surah")}
            <select
              value={surahId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSurahId(id);
                setVerse(1);
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
            {t("verse")}
            <input
              type="number"
              min={1}
              max={maxVerse}
              value={Math.min(verse, maxVerse)}
              onChange={(e) => setVerse(Number(e.target.value) || 1)}
            />
          </label>
          <label>
            {t("aspect")}
            <select
              value={premium ? aspect : FREE_IMAGE_ASPECT}
              disabled={!premium}
              onChange={(e) => setAspect(e.target.value as ImageAspect)}
            >
              {(premium ? PLUS_IMAGE_ASPECTS : [FREE_IMAGE_ASPECT]).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="create-check">
            <input
              type="checkbox"
              checked={withTr}
              onChange={(e) => setWithTr(e.target.checked)}
            />
            {t("includeTranslation")}
          </label>
          {withTr ? (
            <label>
              {t("edition")}
              <select
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
              >
                {editions.map((ed) => (
                  <option key={ed.slug} value={ed.slug}>
                    {ed.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {premium ? (
            <label>
              {t("background")}
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
            </label>
          ) : null}
          <button
            type="button"
            className="auth-btn auth-btn--google"
            disabled={busy}
            onClick={() => void download()}
          >
            {busy ? t("exporting") : t("downloadPng")}
          </button>
          {error ? <p className="create-error">{error}</p> : null}
        </div>
        <div className="create-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={previewUrl}
            src={previewUrl}
            alt={t("previewAlt")}
            className="create-preview-img"
          />
        </div>
      </div>
    </div>
  );
}
