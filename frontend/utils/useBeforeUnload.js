import { useEffect } from "react";

/**
 * Native "Leave site? / Reload site?" guard.
 *
 * Only prompts on a *genuine* exit, closing the tab, or typing a new URL, 
 * NOT when the app itself reloads/navigates (e.g. switching journals) or when
 * the user clicks a link/button inside the app. Those are treated as
 * app-initiated and suppressed.
 *
 * The dialog text is set by the browser and can't be customised, and browsers
 * only show it after the user has interacted with the page.
 */

let skipUntil = 0; // suppress the prompt until this timestamp (ms)
let installed = false;

/** Suppress the next unload prompt (call right before a programmatic reload). */
export function allowUnloadOnce(ms = 5000) {
  skipUntil = Date.now() + ms;
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Programmatic reloads (journal switch, exchange connect, settings save…)
  // should never prompt. Wrap location.reload where the browser allows it.
  try {
    const loc = window.location;
    const orig = loc.reload.bind(loc);
    Object.defineProperty(loc, "reload", {
      configurable: true,
      value: function (...args) {
        allowUnloadOnce();
        return orig(...args);
      },
    });
  } catch {
    /* some browsers make location.reload read-only, fall back to the
       click heuristic below */
  }

  // A click on a link/button inside the page that leads to a navigation
  // shouldn't prompt. Closing the tab is a click on browser chrome (not the
  // document), so it still prompts.
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("a, button, [role='button'], input[type='submit']")) {
        skipUntil = Date.now() + 2000;
      }
    },
    true,
  );

  // A submit (Enter in a form) is also app-initiated.
  document.addEventListener(
    "submit",
    () => {
      skipUntil = Date.now() + 2000;
    },
    true,
  );
}

export default function useBeforeUnload(enabled) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    install();
    const handler = (e) => {
      if (Date.now() < skipUntil) return undefined; // app-initiated → don't prompt
      e.preventDefault();
      e.returnValue = ""; // Chrome needs this for the prompt to appear
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
