"use client";

type Props = {
  pdfUrl: string;
  title: string;
};

export function LibraryPdfReader({ pdfUrl, title }: Props) {
  return (
    <div className="library-reader">
      <iframe
        src={pdfUrl}
        title={title}
        className="library-reader-frame"
        loading="lazy"
      />
      <p className="library-reader-fallback">
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          {title}
        </a>
      </p>
    </div>
  );
}
