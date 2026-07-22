"use client";

import { ShareMenu } from "@/components/ShareMenu";

export function PageShareButton({
  title,
  text,
  path,
  label = "مشاركة",
}: {
  title: string;
  text: string;
  path: string;
  label?: string;
}) {
  return (
    <ShareMenu
      items={[
        {
          id: "main",
          label,
          payload: { title, text, url: path },
        },
      ]}
      label={label}
    />
  );
}
