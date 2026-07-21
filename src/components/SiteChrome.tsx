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
          <Link href="/books" onClick={() => setOpen(false)}>
            الإعراب
          </Link>
          <Link href="/resources" onClick={() => setOpen(false)}>
            موارد
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
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-top">
          <div className="footer-brand-col">
            <BrandLockup size="footer" />
            <p className="footer-mission">
              منصة لدراسة القرآن كلمةً بكلمة: صرف، نحو، دلالة، وبلاغة — بمصادر
              مفتوحة ومنسوبة.
            </p>
          </div>

          <nav className="footer-nav-grid" aria-label="روابط التذييل">
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
              <h2 className="footer-col-title">دراسة</h2>
              <ul className="footer-links">
                <li>
                  <Link href="/books">كتب الإعراب</Link>
                </li>
                <li>
                  <Link href="/resources">الموارد</Link>
                </li>
                <li>
                  <Link href="/qiraat">القراءات</Link>
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
                <li>
                  <Link href="/hadith">الأحاديث</Link>
                </li>
                <li>
                  <Link href="/heritage">التراث</Link>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h2 className="footer-col-title">المصادر</h2>
              <ul className="footer-links">
                <li>
                  <a
                    href="https://quran.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Quran.com
                  </a>
                </li>
                <li>
                  <a
                    href="http://corpus.quran.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Quranic Arabic Corpus
                  </a>
                </li>
                <li>
                  <span className="footer-muted">مصحف المدينة · الرسم العثماني</span>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-legal">
            © 2026 عربية · جميع الحقوق محفوظة للمحتوى الأصلي للمنصة
          </p>
          <p className="footer-sources">
            النص القرآني والبيانات اللغوية من مصادر مفتوحة مرخّصة — لا نعيد نشر
            كتب محمية دون إذن.
          </p>
        </div>
      </div>
    </footer>
  );
}
