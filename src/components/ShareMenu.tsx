"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  absoluteUrl,
  shareOrCopy,
  socialShareLinks,
  type SharePayload,
} from "@/lib/share";

type ShareItem = {
  id: string;
  label: string;
  payload: SharePayload;
};

export function ShareMenu({
  items,
  label = "مشاركة",
  onStatus,
}: {
  items: ShareItem[];
  label?: string;
  onStatus?: (note: string | null, clearMs?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const runShare = async (item: ShareItem) => {
    const payload = {
      ...item.payload,
      url: absoluteUrl(item.payload.url),
    };
    const result = await shareOrCopy(payload);
    if (result === "shared") onStatus?.("تمت المشاركة", 1800);
    else if (result === "copied") onStatus?.("تم نسخ الرابط والنص", 1800);
    else onStatus?.(payload.url, 2500);
    setOpen(false);
  };

  if (!items.length) return null;

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        type="button"
        className={`tool-btn share-menu-toggle ${open ? "is-on" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <div id={menuId} className="share-menu-panel" role="menu">
          {items.map((item) => (
            <div key={item.id} className="share-menu-block">
              <button
                type="button"
                className="share-menu-primary"
                role="menuitem"
                onClick={() => void runShare(item)}
              >
                {item.label}
              </button>
              <div className="share-menu-social" aria-label={`مشاركة ${item.label}`}>
                {socialShareLinks({
                  ...item.payload,
                  url: absoluteUrl(item.payload.url),
                }).map((s) => (
                  <a
                    key={s.id}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-menu-social-link"
                    onClick={() => setOpen(false)}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
