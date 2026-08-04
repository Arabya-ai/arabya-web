"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share, X } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/storage-keys";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(mq || iosStandalone);
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

/**
 * Android: native install via beforeinstallprompt.
 * iPhone Safari: guided Add to Home Screen (no install API on iOS).
 */
export function InstallAppPrompt() {
  const t = useTranslations("Install");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    try {
      if (localStorage.getItem(STORAGE_KEYS.installPromptDismissed) === "1") {
        return;
      }
    } catch {
      /* ignore */
    }

    if (isIosSafari()) {
      const timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 3500);
      return () => window.clearTimeout(timer);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setDeferred(null);
    try {
      localStorage.setItem(STORAGE_KEYS.installPromptDismissed, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEYS.installPromptDismissed, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="install-app-prompt" role="dialog" aria-label={t("title")}>
      <div className="install-app-prompt__inner">
        {/* Local static PWA icon; next/image adds little benefit in this toast. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="install-app-prompt__icon"
        />
        <div className="install-app-prompt__copy">
          <p className="install-app-prompt__title">{t("title")}</p>
          <p className="install-app-prompt__desc">
            {iosHint ? t("iosHint") : t("androidHint")}
          </p>
          {iosHint && (
            <p className="install-app-prompt__steps">
              <Share className="install-app-prompt__share" aria-hidden />
              {t("iosSteps")}
            </p>
          )}
        </div>
        <div className="install-app-prompt__actions">
          {!iosHint && deferred && (
            <button
              type="button"
              className="install-app-prompt__cta"
              onClick={() => void install()}
            >
              <Download aria-hidden />
              {t("install")}
            </button>
          )}
          <button
            type="button"
            className="install-app-prompt__dismiss"
            onClick={dismiss}
            aria-label={t("dismiss")}
          >
            <X aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
