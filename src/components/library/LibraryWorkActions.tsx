"use client";

import { useCallback, useState } from "react";
import { Check, Copy, ExternalLink, Printer, Share2 } from "lucide-react";
import { isExternalLibraryPdfUrl } from "@/lib/library/google-drive";

type Props = {
  pdfUrl: string;
  pageUrl: string;
  locale: string;
  labels: {
    download: string;
    copyLink: string;
    share: string;
    print: string;
    copied: string;
  };
};

export function LibraryWorkActions({
  pdfUrl,
  pageUrl,
  locale,
  labels,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      const full = `${window.location.origin}${pageUrl}`;
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }, [pageUrl]);

  const share = useCallback(async () => {
    const full = `${window.location.origin}${pageUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: full, title: document.title });
        return;
      } catch {
        /* fall through */
      }
    }
    void copyLink();
  }, [copyLink, pageUrl]);

  const external = isExternalLibraryPdfUrl(pdfUrl);

  return (
    <div className="library-work-actions">
      {external ? (
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="library-work-download">
          {locale === "en" ? "Open in Google Drive" : "فتح في Google Drive"}
        </a>
      ) : (
        <a href={pdfUrl} download className="library-work-download">
          {labels.download}
        </a>
      )}
      <div className="library-work-secondary-actions">
        <button type="button" onClick={() => void copyLink()}>
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? labels.copied : labels.copyLink}
        </button>
        <button type="button" onClick={() => void share()}>
          <Share2 size={16} aria-hidden />
          {labels.share}
        </button>
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} aria-hidden />
          {labels.print}
        </button>
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden />
          {locale === "en" ? "Open PDF" : "فتح PDF"}
        </a>
      </div>
    </div>
  );
}
