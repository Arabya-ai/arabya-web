"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link
          href="/"
          className="brand"
          aria-label="عربية — الصفحة الرئيسية"
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
          <Link href="/juz" onClick={() => setOpen(false)}>
            الأجزاء
          </Link>
          <Link href="/roots" onClick={() => setOpen(false)}>
            الجذور
          </Link>
          <Link href="/asma" onClick={() => setOpen(false)}>
            الأسماء الحسنى
          </Link>
          <Link href="/study" onClick={() => setOpen(false)}>
            دراسة سريعة
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            عن عربية
          </Link>
          <Link href="/privacy" onClick={() => setOpen(false)}>
            الخصوصية
          </Link>
          <ThemeToggle />
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
        <div className="footer-bar">
          <div className="footer-brand-inline">
            <BrandLockup size="footer" />
            <p className="footer-mission">
              القرآن الكريم كلمة بكلمة: نحو وصرف ودلالة وتفسير وترجمة
            </p>
          </div>
          <nav className="footer-inline-nav" aria-label="روابط التذييل">
            <Link href="/">الفهرس</Link>
            <Link href="/juz">الأجزاء</Link>
            <Link href="/mushaf/1">المصحف</Link>
            <Link href="/roots">الجذور</Link>
            <Link href="/asma">الأسماء الحسنى</Link>
            <Link href="/study">دراسة سريعة</Link>
            <Link href="/about">عن عربية</Link>
            <Link href="/privacy">الخصوصية</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <p className="footer-legal" suppressHydrationWarning>
            © {year}{" "}
            <Link href="/" className="footer-site-link">
              منصة عربية
            </Link>
            <span className="footer-sep" aria-hidden>
              ·
            </span>
            <span>جميع الحقوق محفوظة لكل مسلم</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
