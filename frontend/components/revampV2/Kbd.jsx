"use client";

/* Small keycap hint used throughout the app to surface keyboard shortcuts.
   Usage:
     <Kbd>Esc</Kbd>
     <Kbd combo={[MOD, "↵"]} />   → ⌘ ↵  (two caps)
     <Kbd combo={["←", "→"]} sep="/" />
*/

import { useEffect, useState } from "react";

// ⌘ on macOS, Ctrl elsewhere — resolved on the client to avoid SSR mismatch.
export const MOD = "mod";

export function useIsMac() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    try {
      const p = navigator.platform || navigator.userAgent || "";
      setMac(/Mac|iPhone|iPad|iPod/i.test(p));
    } catch {}
  }, []);
  return mac;
}

export function modLabel(mac) {
  return mac ? "⌘" : "Ctrl";
}

export default function Kbd({ children, combo, sep, muted = true }) {
  const mac = useIsMac();
  const render = (k, i) => (
    <kbd key={i} className="jx-kbd">
      {k === MOD ? modLabel(mac) : k}
    </kbd>
  );
  if (combo && combo.length) {
    return (
      <span className={`jx-kbd-group${muted ? " jx-kbd-group--muted" : ""}`}>
        {combo.map((k, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            {i > 0 && sep && <span className="jx-kbd-sep">{sep}</span>}
            {render(k, i)}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className={`jx-kbd-group${muted ? " jx-kbd-group--muted" : ""}`}>
      {render(children, 0)}
    </span>
  );
}
