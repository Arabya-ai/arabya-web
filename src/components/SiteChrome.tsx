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
        <div className="footer-top">
          <div className="footer-brand-col">
            <BrandLockup size="footer" />
            <p className="footer-mission">
              القرآن الكريم كلمة بكلمة: نحو وصرف ودلالة وتفسير وترجمة
            </p>
          </div>

          <nav className="footer-nav-grid footer-nav-grid--simple" aria-label="روابط التذييل">
            <div className="footer-col">
              <h2 className="footer-col-title">استكشف</h2>
              <ul className="footer-links">
                <li>
                  <Link href="/">فهرس السور</Link>
                </li>
                <li>
                  <Link href="/juz">الأجزاء</Link>
                </li>
                <li>
                  <Link href="/mushaf/1">المصحف</Link>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h2 className="footer-col-title">عن المنصة</h2>
              <ul className="footer-links">
                <li>
                  <Link href="/about">عن عربية</Link>
                </li>
                <li>
                  <Link href="/privacy">الخصوصية</Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-legal" suppressHydrationWarning>
            © {year}{" "}
            <Link href="/" className="footer-site-link">
              منصة عربية
            </Link>
          </p>
          <p className="footer-sources">جميع الحقوق محفوظة لكل مسلم</p>
        </div>
      </div>
    </footer>
  );
}
