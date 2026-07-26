"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AuthButton } from "@/components/AuthButton";
import { BrandLockup } from "@/components/BrandLockup";
import { PreferencesMenu } from "@/components/PreferencesMenu";
import { Link } from "@/i18n/navigation";

/** Site chrome for all pages including Arabya Studio (header + footer). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}

function ServicesMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Nav");
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

  function go() {
    return () => {
      setOpen(false);
      onNavigate?.();
    };
  }

  return (
    <div
      className={`nav-dropdown ${open ? "is-open" : ""}`}
      ref={rootRef}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="nav-dropdown-trigger nav-link-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {t("services")}
      </button>
      <div className="nav-dropdown-menu" role="menu">
        <Link href="/juz" role="menuitem" onClick={go()}>
          {t("juz")}
        </Link>
        <Link href="/roots" role="menuitem" onClick={go()}>
          {t("roots")}
        </Link>
        <Link href="/asma" role="menuitem" onClick={go()}>
          {t("asma")}
        </Link>
        <Link href="/study" role="menuitem" onClick={go()}>
          {t("study")}
        </Link>
        <Link href="/studio" role="menuitem" onClick={go()}>
          {t("studio")}
        </Link>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        "--arabya-header-height",
        `${el.offsetHeight}px`,
      );
    };
    syncHeight();

    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="shell header-inner">
        <Link
          href="/"
          className="brand"
          aria-label={t("brandHome")}
          onClick={() => setOpen(false)}
        >
          <BrandLockup size="header" />
        </Link>

        <div className="header-actions">
          <div className="header-prefs" aria-hidden={open ? true : undefined}>
            <PreferencesMenu compact />
          </div>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("close") : t("menu")}
          </button>
        </div>

        <nav
          id="main-nav"
          className={`nav ${open ? "is-open" : ""}`}
          aria-label={t("mainNav")}
        >
          <Link href="/" onClick={() => setOpen(false)}>
            {t("home")}
          </Link>
          <ServicesMenu onNavigate={() => setOpen(false)} />
          <Link href="/about" onClick={() => setOpen(false)}>
            {t("about")}
          </Link>
          <Link href="/privacy" onClick={() => setOpen(false)}>
            {t("privacy")}
          </Link>
          <AuthButton />
          <div className="nav-prefs-slot">
            <PreferencesMenu compact />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useTranslations("Nav");
  const tFooter = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell site-footer-shell">
        <div className="arabya-footer-panel">
          <Link
            href="/"
            className="arabya-footer-brand"
            aria-label={t("brandHome")}
          >
            <BrandLockup size="footer" />
          </Link>

          <div className="arabya-footer-nav-row">
            <nav className="arabya-footer-menu" aria-label={t("footerNav")}>
              <Link href="/">{t("home")}</Link>
              <Link href="/mushaf/1">{t("mushaf")}</Link>
              <Link href="/juz">{t("juz")}</Link>
              <Link href="/roots">{t("roots")}</Link>
              <Link href="/studio">{t("studio")}</Link>
              <Link href="/about">{t("about")}</Link>
              <Link href="/privacy">{t("privacy")}</Link>
            </nav>
            <div className="arabya-footer-prefs">
              <PreferencesMenu compact />
            </div>
          </div>

          <p className="arabya-footer-credit" suppressHydrationWarning>
            {tFooter("credit", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
