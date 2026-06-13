"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * PWA install helper.
 *
 *  canInstall   — Chrome/Edge/Android fired `beforeinstallprompt` and the app
 *                 isn't already installed → we can show a native prompt.
 *  isIOS        — iOS Safari (no beforeinstallprompt) and not yet installed →
 *                 we show "Add to Home Screen" instructions instead.
 *  isStandalone — already running as an installed app → hide all install UI.
 *  promptInstall() — triggers the native prompt (returns "accepted"/"dismissed"/null).
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent || "";
    const ios = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    setIsIOS(ios && !standalone);

    try {
      setDismissed(localStorage.getItem("jx-pwa-dismissed") === "1");
    } catch {}

    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return null;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setInstalled(true);
    return outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem("jx-pwa-dismissed", "1");
    } catch {}
  }, []);

  // can show a native prompt right now
  const canInstall = !!deferred && !installed && !isStandalone;
  // should we surface any install affordance at all?
  const showInstallUI =
    !installed && !isStandalone && !dismissed && (canInstall || isIOS);

  return {
    canInstall,
    isIOS,
    isStandalone,
    installed,
    dismissed,
    showInstallUI,
    promptInstall,
    dismiss,
  };
}
