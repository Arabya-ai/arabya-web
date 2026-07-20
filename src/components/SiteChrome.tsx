"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link
          href="/"
          className="brand"
          aria-label="Arabya — الصفحة الرئيسية"
          onClick={() => setOpen(false)}
        >
          <BrandLockup size="header" />
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "إغلاق" : "القائمة"}
        </button>

        <nav
          id="main-nav"
          className={`nav ${open ? "is-open" : ""}`}
          aria-label="التنقل الرئيسي"
        >
          <Link href="/" onClick={() => setOpen(false)}>
            الفهرس
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            عن Arabya
          </Link>
          <Link href="/privacy" onClick={() => setOpen(false)}>
            الخصوصية
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand-block">
          <BrandLockup size="footer" />
        </div>
        <p className="footer-legal">
          © {year} Arabya · <Link href="/privacy">سياسة الخصوصية</Link>
        </p>
        <p className="footer-sources">
          الرسم العثماني · مصحف المدينة · مصادر مفتوحة:{" "}
          <a href="https://quran.com" target="_blank" rel="noreferrer">
            Quran.com
          </a>{" "}
          ·{" "}
          <a href="http://corpus.quran.com" target="_blank" rel="noreferrer">
            Quranic Arabic Corpus
          </a>
        </p>
      </div>
    </footer>
  );
}
