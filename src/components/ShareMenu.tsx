"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  absoluteUrl,
  copyLinkOnly,
  shareOrCopy,
  socialShareLinks,
  type ShareTarget,
} from "@/lib/share";

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.1-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.1-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.3-.4.1-.1.1-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4 1.4.6 1.9.6 2.5.5.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.6-.3zM12.1 21.2h-.1c-1.7 0-3.3-.5-4.7-1.3L5 20.7l.8-2.3c-1-1.5-1.5-3.2-1.5-5 0-5.1 4.1-9.2 9.2-9.2 2.5 0 4.8 1 6.5 2.7 1.7 1.7 2.7 4 2.7 6.5-.1 5.1-4.2 9.2-9.3 9.2zm7.8-16.5C17.9 2.7 15.1 1.5 12 1.5 5.9 1.5 1 6.4 1 12.5c0 2 .5 3.9 1.5 5.6L1 23l5-1.3c1.6.9 3.4 1.3 5.2 1.3h0c6.1 0 11-4.9 11.1-11 0-2.9-1.2-5.7-3.4-7.8z"
      />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.8 15.4 9.5 19c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7L21.9 4.5c.3-1.2-.4-1.7-1.2-1.4L3.1 9.2c-1.1.4-1.1 1.1-.2 1.4l4.6 1.4 10.6-6.7c.5-.3 1-.1.6.2L9.8 15.4z"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.2 2H21l-6.6 7.5L22 22h-6.2l-4.9-6.4L5.3 22H2.5l7-8L2 2h6.3l4.4 5.8L18.2 2zm-1.1 18h1.7L7 3.9H5.2L17.1 20z"
      />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z"
      />
    </svg>
  );
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 16.1c-.8 0-1.4.3-1.9.8l-6.9-4c.1-.3.1-.5.1-.8s0-.5-.1-.8l6.8-4c.5.5 1.2.8 1.9.8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .3 0 .5.1.8l-6.8 4C8.6 8.8 7.9 8.5 7.2 8.5c-1.7 0-3 1.3-3 3s1.3 3 3 3c.7 0 1.4-.3 1.9-.8l6.9 4c-.1.2-.1.5-.1.7 0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3z"
      />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, () => ReactNode> = {
  whatsapp: IconWhatsApp,
  telegram: IconTelegram,
  x: IconX,
  facebook: IconFacebook,
};

export function ShareMenu({
  targets,
  label = "مشاركة",
  onStatus,
}: {
  targets: ShareTarget[];
  label?: string;
  onStatus?: (note: string | null, clearMs?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(targets[0]?.id ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!targets.some((t) => t.id === activeId)) {
      setActiveId(targets[0]?.id ?? "");
    }
  }, [targets, activeId]);

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

  const active = useMemo(
    () => targets.find((t) => t.id === activeId) ?? targets[0] ?? null,
    [targets, activeId],
  );

  if (!targets.length || !active) return null;

  const fullUrl = absoluteUrl(active.payload.url);

  const onCopyLink = async () => {
    const ok = await copyLinkOnly(active.payload.url);
    onStatus?.(ok ? "تم نسخ الرابط" : "تعذّر نسخ الرابط", 1800);
  };

  const onNativeShare = async () => {
    const result = await shareOrCopy(active.payload);
    if (result === "shared") onStatus?.("تمت المشاركة", 1800);
    else if (result === "copied") onStatus?.("تم نسخ النص والرابط", 1800);
    else onStatus?.(fullUrl, 2500);
  };

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        type="button"
        className={`tool-btn share-menu-toggle ${open ? "is-on" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        title={label}
      >
        <IconShare />
        <span>{label}</span>
      </button>
      {open ? (
        <div id={menuId} className="share-menu-panel" role="dialog" aria-label={label}>
          <p className="share-menu-heading">ماذا تشارك؟</p>
          <div className="share-kind-list" role="tablist" aria-label="نوع المشاركة">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === active.id}
                className={`share-kind-chip ${t.id === active.id ? "is-on" : ""}`}
                onClick={() => setActiveId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <p className="share-menu-hint">{active.hint}</p>

          <div className="share-url-row">
            <code className="share-url-preview" title={fullUrl}>
              {fullUrl.replace(/^https?:\/\//, "")}
            </code>
            <button
              type="button"
              className="share-icon-btn share-icon-btn--copy"
              onClick={() => void onCopyLink()}
              title="نسخ الرابط"
              aria-label="نسخ الرابط"
            >
              <IconCopy />
            </button>
          </div>

          <div className="share-icon-row" aria-label="المشاركة عبر">
            {socialShareLinks(active.payload).map((s) => {
              const Icon = SOCIAL_ICONS[s.id];
              return (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`share-icon-btn share-icon-btn--${s.id}`}
                  title={s.label}
                  aria-label={s.label}
                  onClick={() => setOpen(false)}
                >
                  {Icon ? <Icon /> : s.label}
                </a>
              );
            })}
            <button
              type="button"
              className="share-icon-btn share-icon-btn--native"
              onClick={() => void onNativeShare()}
              title="مشاركة الجهاز"
              aria-label="مشاركة الجهاز"
            >
              <IconShare />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
