"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/ayat-studio/components/ui/button";
import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";
import { Textarea } from "@/ayat-studio/components/ui/textarea";
import { EngineBanner } from "@/mpt-studio/components/EngineBanner";
import { mptGet, mptPost, unwrapData } from "@/mpt-studio/lib/client";
import {
  parseMptMaterials,
  preferredLocalMaterials,
  type MptMaterialFile,
} from "@/mpt-studio/lib/materials";
import { mptStudioPath } from "@/mpt-studio/lib/paths";
import { MPT_LANGUAGES, MPT_VOICES } from "@/mpt-studio/lib/voices";
import {
  MPT_ASPECTS,
  MPT_SOURCES,
  type MptVideoBody,
} from "@/lib/mpt-payload";

const defaultForm: MptVideoBody = {
  video_subject: "",
  video_script: "",
  video_terms: "",
  video_language: "Arabic",
  video_aspect: "9:16",
  video_concat_mode: "sequential",
  video_clip_duration: 5,
  video_count: 1,
  video_source: "local",
  voice_name: "ar-SA-ZariyahNeural-Female",
  voice_volume: 1,
  voice_rate: 1,
  bgm_type: "random",
  bgm_volume: 0,
  subtitle_enabled: true,
  subtitle_position: "bottom",
  font_name: "BeVietnamPro-Bold.ttf",
  font_size: 60,
  text_fore_color: "#FFFFFF",
  stroke_color: "#000000",
  stroke_width: 1.5,
  paragraph_number: 1,
};

function asMaterials(urls: string[]): MptVideoBody["video_materials"] {
  return urls.map((url) => ({ provider: "local", url }));
}

export default function AiCreate() {
  const t = useTranslations("StudioAi");
  const router = useRouter();
  const [form, setForm] = useState<MptVideoBody>(defaultForm);
  const [busy, setBusy] = useState<"script" | "terms" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MptMaterialFile[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const localeIsAr = useMemo(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.lang !== "en";
  }, []);

  const selectedFiles = useMemo(
    () => new Set((form.video_materials || []).map((item) => item.url)),
    [form.video_materials],
  );

  function patch(partial: Partial<MptVideoBody>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  useEffect(() => {
    if (form.video_source !== "local") return;
    let cancelled = false;
    void mptGet("/api/studio/ai/materials").then(({ status, json }) => {
      if (cancelled) return;
      if (status >= 400) {
        setMaterialsError(t("errorMaterials"));
        return;
      }
      const files = parseMptMaterials(json);
      setMaterialsError(null);
      setMaterials(files);
      setForm((prev) => {
        if (prev.video_source !== "local" || (prev.video_materials || []).length) {
          return prev;
        }
        const preferred = preferredLocalMaterials(files).slice(0, 6);
        return preferred.length
          ? { ...prev, video_materials: asMaterials(preferred.map((item) => item.file)) }
          : prev;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [form.video_source, t]);

  function toggleMaterial(file: string, checked: boolean) {
    setForm((prev) => {
      const current = (prev.video_materials || []).map((item) => item.url);
      const next = checked
        ? [...new Set([...current, file])]
        : current.filter((name) => name !== file);
      return { ...prev, video_materials: asMaterials(next) };
    });
  }

  async function generateScript() {
    setError(null);
    setBusy("script");
    const { status, json } = await mptPost("/api/studio/ai/scripts", {
      video_subject: form.video_subject,
      video_language: form.video_language,
      paragraph_number: form.paragraph_number,
    });
    setBusy(null);
    if (status >= 400) {
      setError(t("errorScript"));
      return;
    }
    const data = unwrapData(json) as { video_script?: string };
    if (data?.video_script) patch({ video_script: data.video_script });
    else setError(t("errorScript"));
  }

  async function generateTerms() {
    setError(null);
    setBusy("terms");
    const { status, json } = await mptPost("/api/studio/ai/terms", {
      video_subject: form.video_subject,
      video_script: form.video_script,
      amount: 5,
    });
    setBusy(null);
    if (status >= 400) {
      setError(t("errorTerms"));
      return;
    }
    const data = unwrapData(json) as { video_terms?: string[] | string };
    const terms = Array.isArray(data?.video_terms)
      ? data.video_terms.join(", ")
      : data?.video_terms || "";
    if (terms) patch({ video_terms: terms });
    else setError(t("errorTerms"));
  }

  async function generateVideo(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.video_source === "local" && !(form.video_materials || []).length) {
      setError(t("errorMaterials"));
      return;
    }
    setBusy("video");
    const payload: MptVideoBody = {
      ...form,
      video_materials:
        form.video_source === "local" ? form.video_materials : undefined,
    };
    const { status, json } = await mptPost("/api/studio/ai/videos", payload);
    setBusy(null);
    if (status >= 400) {
      setError(t("errorVideo"));
      return;
    }
    const data = unwrapData(json) as { task_id?: string };
    if (data?.task_id) {
      router.push(mptStudioPath(`/tasks/${data.task_id}`));
      return;
    }
    setError(t("errorVideo"));
  }

  return (
    <div className="mpt-studio space-y-6">
      <EngineBanner />
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t("createTitle")}</h1>
        <p className="mpt-muted mt-2">{t("createLead")}</p>
      </div>

      <form className="space-y-5" onSubmit={(event) => void generateVideo(event)}>
        <fieldset>
          <legend>{t("sectionTopic")}</legend>
          <div className="space-y-3">
            <div>
              <Label htmlFor="mpt-subject">{t("subject")}</Label>
              <Input
                id="mpt-subject"
                required
                minLength={2}
                maxLength={500}
                value={form.video_subject}
                onChange={(e) => patch({ video_subject: e.target.value })}
                placeholder={t("subjectPlaceholder")}
              />
            </div>
            <div className="mpt-grid mpt-grid-2">
              <div>
                <Label htmlFor="mpt-lang">{t("language")}</Label>
                <select
                  id="mpt-lang"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.video_language}
                  onChange={(e) => patch({ video_language: e.target.value })}
                >
                  {MPT_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {localeIsAr ? lang.labelAr : lang.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="mpt-paragraphs">{t("paragraphs")}</Label>
                <Input
                  id="mpt-paragraphs"
                  type="number"
                  min={1}
                  max={5}
                  value={form.paragraph_number}
                  onChange={(e) =>
                    patch({ paragraph_number: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mpt-script">{t("script")}</Label>
              <Textarea
                id="mpt-script"
                rows={7}
                value={form.video_script}
                onChange={(e) => patch({ video_script: e.target.value })}
                placeholder={t("scriptPlaceholder")}
              />
              <div className="mpt-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null || form.video_subject.trim().length < 2}
                  onClick={() => void generateScript()}
                >
                  {busy === "script" ? t("working") : t("generateScript")}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="mpt-terms">{t("terms")}</Label>
              <Input
                id="mpt-terms"
                value={form.video_terms}
                onChange={(e) => patch({ video_terms: e.target.value })}
                placeholder={t("termsPlaceholder")}
              />
              <div className="mpt-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null || form.video_script.trim().length < 8}
                  onClick={() => void generateTerms()}
                >
                  {busy === "terms" ? t("working") : t("generateTerms")}
                </Button>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t("sectionVideo")}</legend>
          <div className="mpt-grid mpt-grid-2">
            <div>
              <Label htmlFor="mpt-aspect">{t("aspect")}</Label>
              <select
                id="mpt-aspect"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.video_aspect}
                onChange={(e) =>
                  patch({ video_aspect: e.target.value as MptVideoBody["video_aspect"] })
                }
              >
                {MPT_ASPECTS.map((aspect) => (
                  <option key={aspect} value={aspect}>
                    {aspect}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="mpt-source">{t("source")}</Label>
              <select
                id="mpt-source"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.video_source}
                onChange={(e) => {
                  const video_source = e.target.value as MptVideoBody["video_source"];
                  patch({
                    video_source,
                    video_concat_mode: video_source === "local" ? "sequential" : "random",
                    video_materials: video_source === "local" ? form.video_materials : undefined,
                  });
                }}
              >
                {MPT_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {t(`source_${source}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="mpt-clip">{t("clipDuration")}</Label>
              <Input
                id="mpt-clip"
                type="number"
                min={2}
                max={20}
                value={form.video_clip_duration}
                onChange={(e) =>
                  patch({ video_clip_duration: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="mpt-count">{t("videoCount")}</Label>
              <Input
                id="mpt-count"
                type="number"
                min={1}
                max={3}
                value={form.video_count}
                onChange={(e) => patch({ video_count: Number(e.target.value) })}
              />
            </div>
          </div>
          {form.video_source === "local" ? (
            <div className="mt-4">
              <p className="text-sm font-medium">{t("localMaterials")}</p>
              <p className="mpt-muted">{t("localMaterialsLead")}</p>
              {materialsError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {materialsError}
                </p>
              ) : null}
              {materials.length === 0 && !materialsError ? (
                <p className="mpt-muted mt-2">{t("localMaterialsEmpty")}</p>
              ) : (
                <div className="mpt-materials">
                  {materials.map((item) => (
                    <label key={item.file}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(item.file)}
                        onChange={(e) => toggleMaterial(item.file, e.target.checked)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </fieldset>

        <fieldset>
          <legend>{t("sectionVoice")}</legend>
          <div className="mpt-grid mpt-grid-2">
            <div>
              <Label htmlFor="mpt-voice">{t("voice")}</Label>
              <select
                id="mpt-voice"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.voice_name}
                onChange={(e) => patch({ voice_name: e.target.value })}
              >
                {MPT_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {localeIsAr ? voice.labelAr : voice.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="mpt-rate">{t("voiceRate")}</Label>
              <Input
                id="mpt-rate"
                type="number"
                min={0.5}
                max={2}
                step={0.1}
                value={form.voice_rate}
                onChange={(e) => patch({ voice_rate: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.subtitle_enabled}
              onChange={(e) => patch({ subtitle_enabled: e.target.checked })}
            />
            {t("subtitles")}
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.bgm_volume === 0}
              onChange={(e) => patch({ bgm_volume: e.target.checked ? 0 : 0.2 })}
            />
            {t("noBgm")}
          </label>
        </fieldset>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="hero" size="lg" disabled={busy !== null}>
          {busy === "video" ? t("working") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
