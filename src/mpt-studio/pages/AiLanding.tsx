"use client";

import { Button } from "@/ayat-studio/components/ui/button";
import { Card, CardContent } from "@/ayat-studio/components/ui/card";
import { Link } from "@/i18n/navigation";
import { mptStudioPath } from "@/mpt-studio/lib/paths";
import { EngineBanner } from "@/mpt-studio/components/EngineBanner";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { useTranslations } from "next-intl";
import { Clapperboard, Sparkles, ListVideo, BookOpen } from "lucide-react";

export default function AiLanding() {
  const t = useTranslations("StudioAi");

  return (
    <div className="mpt-studio space-y-8">
      <EngineBanner />

      <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-[hsl(var(--card))] p-8 shadow-deep md:p-10">
        <p className="mb-3 text-xs tracking-[0.18em] text-accent">{t("kicker")}</p>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("lead")}</p>
        <div className="mpt-actions">
          <Button variant="hero" size="lg" asChild>
            <Link href={mptStudioPath("/create")}>
              <Sparkles className="h-4 w-4" />
              {t("ctaCreate")}
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={mptStudioPath("/tasks")}>
              <ListVideo className="h-4 w-4" />
              {t("ctaTasks")}
            </Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={studioPath("/dashboard")}>
              <BookOpen className="h-4 w-4" />
              {t("ctaAyatStudio")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mpt-grid mpt-grid-2">
        <Card className="border-accent/15 bg-card/50">
          <CardContent className="space-y-2 p-5">
            <Clapperboard className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold">{t("diffTitle")}</h2>
            <p className="mpt-muted">{t("diffLead")}</p>
          </CardContent>
        </Card>
        <Card className="border-accent/15 bg-card/50">
          <CardContent className="space-y-2 p-5">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold">{t("flowTitle")}</h2>
            <ol className="mpt-muted list-decimal space-y-1 ps-5">
              <li>{t("flow1")}</li>
              <li>{t("flow2")}</li>
              <li>{t("flow3")}</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
