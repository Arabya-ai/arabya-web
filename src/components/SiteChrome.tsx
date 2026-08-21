"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AccountHeaderIcon } from "@/components/AccountHeaderIcon";
import { AuthButton } from "@/components/AuthButton";
import { BrandLockup } from "@/components/BrandLockup";
import { DeferredChrome } from "@/components/DeferredChrome";
import { PreferencesMenu } from "@/components/PreferencesMenu";
import { useDismissibleOpen } from "@/hooks/useDismissibleOpen";
import { Link, usePathname } from "@/i18n/navigation";
import { isStudioEditorViewportPath } from "@/ayat-studio/lib/studio-shell-mode";
import { ServicesMegaPanel } from "@/components/services/ServicesGrid";

/** Site chrome for all pages including Arabya Studio (header + footer). */
export function AppShell({
  children,
  footerCredit,
}: {
  children: React.ReactNode;
  footerCredit: string;
}) {
  const pathname = usePathname();
  // Only the editor needs a locked viewport (preview must fit without page scroll).
  // Dashboard/projects/settings must keep normal page scrolling + footer.
  const editorViewport = isStudioEditorViewportPath(pathname);

  return (
    <>
      <SiteHeader />
      <main className={editorViewport ? "studio-main-viewport" : undefined}>
        {children}
      </main>
      {!editorViewport && <SiteFooter credit={footerCredit} />}
      <DeferredChrome />
    </>
  );
}

function ServicesMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open, setOpen } = useDismissibleOpen(rootRef);
  const [finePointer, setFinePointer] = useState(false);
  const onServicesPage =
    pathname === "/services" || pathname.startsWith("/services/");

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    function sync() {
      setFinePointer(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }

  function go() {
    return () => {
      clearCloseTimer();
      setOpen(false);
      onNavigate?.();
    };
  }

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div
      className={`nav-dropdown nav-dropdown--services ${open ? "is-open" : ""}`}
      ref={rootRef}
      onMouseEnter={finePointer ? openMenu : undefined}
      onMouseLeave={finePointer ? scheduleClose : undefined}
    >
      {/*
        Click / tap → /services page (primary action).
        Desktop hover → mega menu preview (enhancement).
      */}
      <Link
        href="/services"
        className={`nav-dropdown-trigger nav-link-btn ${onServicesPage ? "is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-current={onServicesPage ? "page" : undefined}
        onClick={() => {
          clearCloseTimer();
          setOpen(false);
          onNavigate?.();
        }}
        onFocus={finePointer ? openMenu : undefined}
      >
        {t("services")}
      </Link>
      <div
        className="nav-dropdown-menu nav-mega-wrap"
        role="presentation"
        hidden={!open}
      >
        <ServicesMegaPanel onNavigate={go()} />
      </div>
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("Nav");
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (navRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    function onChange() {
      if (mq.matches) setOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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
          <AccountHeaderIcon />
          <div className="header-prefs">
            <PreferencesMenu compact />
          </div>
          <button
            ref={toggleRef}
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
          ref={navRef}
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
          <Link href="/terms" onClick={() => setOpen(false)}>
            {t("terms")}
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)}>
            {t("contact")}
          </Link>
          <div className="nav-auth-slot">
            <AuthButton />
          </div>
          <div className="nav-prefs-slot">
            <PreferencesMenu compact />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ credit }: { credit: string }) {
  const t = useTranslations("Nav");

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
              <Link href="/services">{t("services")}</Link>
              <Link href="/mushaf/1">{t("mushaf")}</Link>
              <Link href="/juz">{t("juz")}</Link>
              <Link href="/roots">{t("roots")}</Link>
              <Link href="/qiraat">{t("qiraat")}</Link>
              <Link href="/asma">{t("asma")}</Link>
              <Link href="/reciters">{t("reciters")}</Link>
              <Link href="/study">{t("study")}</Link>
              <Link href="/adhkar">{t("adhkar")}</Link>
              <Link href="/qibla">{t("qibla")}</Link>
              <Link href="/tahfeez">{t("tahfeez")}</Link>
              <Link href="/studio">{t("studio")}</Link>
              <Link href="/library">{t("library")}</Link>
              <Link href="/books">{t("books")}</Link>
              <Link href="/hadith">{t("hadith")}</Link>
              <Link href="/heritage">{t("heritage")}</Link>
              <Link href="/resources">{t("resources")}</Link>
              <Link href="/lughawi">{t("lughawi")}</Link>
              <Link href="/about">{t("about")}</Link>
              <Link href="/privacy">{t("privacy")}</Link>
              <Link href="/terms">{t("terms")}</Link>
              <Link href="/contact">{t("contact")}</Link>
              <span className="arabya-footer-prefs">
                <PreferencesMenu compact dropUp />
              </span>
            </nav>
          </div>

          <p className="arabya-footer-credit">{credit}</p>
        </div>
      </div>
    </footer>
  );
}
