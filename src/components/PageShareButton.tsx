"use client";

import { ShareMenu } from "@/components/ShareMenu";
import type { ShareKind, ShareTarget } from "@/lib/share";

export function PageShareButton({
  title,
  text,
  path,
  kind = "irab",
  label = "مشاركة",
  hint = "انسخ الرابط أو شاركه عبر التطبيقات.",
}: {
  title: string;
  text: string;
  path: string;
  kind?: ShareKind;
  label?: string;
  hint?: string;
}) {
  const targets: ShareTarget[] = [
    {
      id: "main",
      kind,
      label,
      hint,
      payload: { kind, title, text, url: path },
    },
  ];
  return <ShareMenu targets={targets} label={label} />;
}
