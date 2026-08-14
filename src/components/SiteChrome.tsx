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
  const rootRef = useRef<HTMLDivElement>(null);
  const { open, setOpen, toggle } = useDismissibleOpen(rootRef);

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
    >
      <button
        type="button"
        className="nav-dropdown-trigger nav-link-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        {t("services")}
      </button>
      <div className="nav-dropdown-menu" role="menu" hidden={!open}>
        <Link href="/juz" role="menuitem" onClick={go()}>
          {t("juz")}
        </Link>
        <Link href="/roots" role="menuitem" onClick={go()}>
          {t("roots")}
        </Link>
        <Link href="/asma" role="menuitem" onClick={go()}>
          {t("asma")}
        </Link>
        <Link href="/reciters" role="menuitem" onClick={go()}>
          {t("reciters")}
        </Link>
        <Link href="/adhkar" role="menuitem" onClick={go()}>
          {t("adhkar")}
        </Link>
        <Link href="/tahfeez" role="menuitem" onClick={go()}>
          {t("tahfeez")}
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
              <Link href="/mushaf/1">{t("mushaf")}</Link>
              <Link href="/juz">{t("juz")}</Link>
              <Link href="/roots">{t("roots")}</Link>
              <Link href="/studio">{t("studio")}</Link>
              <Link href="/about">{t("about")}</Link>
              <Link href="/privacy">{t("privacy")}</Link>
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
