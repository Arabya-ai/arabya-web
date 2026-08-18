"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/ayat-studio/components/ui/button";
import { EngineBanner } from "@/mpt-studio/components/EngineBanner";
import {
  mptDelete,
  mptGet,
  unwrapData,
  type MptTask,
} from "@/mpt-studio/lib/client";
import { mptStudioPath } from "@/mpt-studio/lib/paths";
import {
  MPT_TASK_COMPLETE,
  MPT_TASK_FAILED,
  mptTaskLabelKey,
} from "@/mpt-studio/lib/task-state";

export default function AiTaskDetail({ taskId }: { taskId: string }) {
  const t = useTranslations("StudioAi");
  const router = useRouter();
  const [task, setTask] = useState<MptTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { status, json } = await mptGet(`/api/studio/ai/tasks/${taskId}`);
      if (cancelled) return;
      if (status >= 400) {
        setError(t("errorTask"));
        return;
      }
      const data = unwrapData(json) as MptTask;
      setTask(data);
      return data;
    }

    void load();
    const timer = window.setInterval(() => {
      void load().then((data) => {
        if (!data) return;
        if (data.state === MPT_TASK_COMPLETE || data.state === MPT_TASK_FAILED) {
          window.clearInterval(timer);
        }
      });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [taskId, t]);

  const videos = task?.videos?.length
    ? task.videos
    : task?.combined_videos || [];
  const statusKey = mptTaskLabelKey(task?.state);

  async function removeTask() {
    setError(null);
    const { status } = await mptDelete(`/api/studio/ai/tasks/${taskId}`);
    if (status >= 400) {
      setError(t("errorDelete"));
      return;
    }
    router.push(mptStudioPath("/tasks"));
  }

  return (
    <div className="mpt-studio space-y-6">
      <EngineBanner />
      <div>
        <Button variant="ghost" asChild>
          <Link href={mptStudioPath("/tasks")}>{t("backTasks")}</Link>
        </Button>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">
          {task?.params?.video_subject || t("taskTitle")}
        </h1>
        <p className="mpt-muted mt-2">
          {t(`status_${statusKey}`)} · {task?.progress ?? 0}%
        </p>
      </div>

      <progress max={100} value={task?.progress ?? 0} />

      {task?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {task.failed_stage ? `${task.failed_stage}: ` : ""}
          {task.error}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {videos.map((src) => (
        <div key={src} className="space-y-2">
          <video
            className="w-full max-w-md rounded-2xl border border-border bg-black"
            src={src}
            controls
            playsInline
          />
          <Button variant="outline" asChild>
            <a href={src} download>
              {t("download")}
            </a>
          </Button>
        </div>
      ))}

      <div className="mpt-actions">
        <Button variant="outline" asChild>
          <Link href={mptStudioPath("/create")}>{t("ctaCreate")}</Link>
        </Button>
        <Button type="button" variant="destructive" onClick={() => void removeTask()}>
          {t("deleteTask")}
        </Button>
      </div>
    </div>
  );
}
