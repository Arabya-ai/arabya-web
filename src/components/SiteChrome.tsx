"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "@/components/AuthButton";
import { BrandLockup } from "@/components/BrandLockup";
import { ThemeToggle } from "@/components/ThemeToggle";

function ServicesMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`nav-dropdown ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="nav-dropdown-trigger nav-link-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        خدماتنا
      </button>
      <div className="nav-dropdown-menu" role="menu">
        <Link
          href="/juz"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onNavigate?.();
          }}
        >
          الأجزاء
        </Link>
        <Link
          href="/roots"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onNavigate?.();
          }}
        >
          الجذور
        </Link>
        <Link
          href="/asma"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onNavigate?.();
          }}
        >
          الأسماء الحسنى
        </Link>
        <Link
          href="/study"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onNavigate?.();
          }}
        >
          دراسة سريعة
        </Link>
      </div>
    </div>
  );
}

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
            الرئيسية
          </Link>
          <ServicesMenu onNavigate={() => setOpen(false)} />
          <Link href="/about" onClick={() => setOpen(false)}>
            عن عربية
          </Link>
          <Link href="/privacy" onClick={() => setOpen(false)}>
            الخصوصية
          </Link>
          <AuthButton />
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
            <Link href="/">الرئيسية</Link>
            <span className="footer-nav-group" aria-label="خدماتنا">
              <span className="footer-nav-label">خدماتنا:</span>
              <Link href="/juz">الأجزاء</Link>
              <Link href="/roots">الجذور</Link>
              <Link href="/asma">الأسماء الحسنى</Link>
              <Link href="/study">دراسة سريعة</Link>
            </span>
            <Link href="/mushaf/1">المصحف</Link>
            <Link href="/favorites">المفضّلات</Link>
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
