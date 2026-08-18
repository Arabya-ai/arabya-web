"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/ayat-studio/components/ui/button";
import { Card, CardContent } from "@/ayat-studio/components/ui/card";
import { EngineBanner } from "@/mpt-studio/components/EngineBanner";
import { mptGet, unwrapData, type MptTask } from "@/mpt-studio/lib/client";
import { mptStudioPath } from "@/mpt-studio/lib/paths";
import { mptTaskLabelKey } from "@/mpt-studio/lib/task-state";

export default function AiTasks() {
  const t = useTranslations("StudioAi");
  const [tasks, setTasks] = useState<MptTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void mptGet("/api/studio/ai/tasks?page=1&page_size=20").then(({ status, json }) => {
      if (cancelled) return;
      if (status >= 400) {
        setError(t("errorTasks"));
        return;
      }
      const data = unwrapData(json) as { tasks?: MptTask[] };
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="mpt-studio space-y-6">
      <EngineBanner />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t("tasksTitle")}</h1>
          <p className="mpt-muted mt-2">{t("tasksLead")}</p>
        </div>
        <Button variant="hero" asChild>
          <Link href={mptStudioPath("/create")}>{t("ctaCreate")}</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {tasks.length === 0 && !error ? (
        <Card className="border-dashed border-accent/30">
          <CardContent className="py-12 text-center">
            <p className="font-display text-lg">{t("emptyTasks")}</p>
            <Button className="mt-4" variant="outline" asChild>
              <Link href={mptStudioPath("/create")}>{t("ctaCreate")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const id = task.task_id || "";
            const statusKey = mptTaskLabelKey(task.state);
            return (
              <li key={id || Math.random()}>
                <Link href={mptStudioPath(`/tasks/${id}`)} className="block">
                  <Card className="border-accent/15 bg-card/50 hover-lift">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">
                          {task.params?.video_subject || id}
                        </p>
                        <p className="mpt-muted">
                          {t(`status_${statusKey}`)} · {task.progress ?? 0}%
                        </p>
                      </div>
                      <span className="text-sm text-accent">{t("openTask")}</span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
