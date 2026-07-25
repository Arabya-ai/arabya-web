"use client";

import { useTranslations } from "next-intl";

import { ShareMenu } from "@/components/ShareMenu";
import type { ShareKind, ShareTarget } from "@/lib/share";

export function PageShareButton({
  title,
  text,
  path,
  kind = "irab",
  label,
  hint,
}: {
  title: string;
  text: string;
  path: string;
  kind?: ShareKind;
  label?: string;
  hint?: string;
}) {
  const t = useTranslations("Share");
  const shareLabel = label ?? t("label");
  const shareHint = hint ?? t("defaultHint");

  const targets: ShareTarget[] = [
    {
      id: "main",
      kind,
      label: shareLabel,
      hint: shareHint,
      payload: { kind, title, text, url: path },
    },
  ];
  return <ShareMenu targets={targets} label={shareLabel} />;
}
