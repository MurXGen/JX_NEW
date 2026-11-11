"use client";

/* Slowly rotating, glowing dotted globe for the auth screens (desktop only).
   Markers show where JournalX traders journal from. Respects
   prefers-reduced-motion (renders a still globe) and pauses while the tab
   is hidden. Drag to spin. */

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

/* Where JournalX traders are. Edit this list to match real usage data. */
export const TRADER_LOCATIONS = [
  { city: "Mumbai", country: "India", loc: [19.07, 72.88] },
  { city: "Bengaluru", country: "India", loc: [12.97, 77.59] },
  { city: "New York", country: "United States", loc: [40.71, -74.0] },
  { city: "Chicago", country: "United States", loc: [41.88, -87.63] },
  { city: "London", country: "United Kingdom", loc: [51.5, -0.12] },
  { city: "Dubai", country: "UAE", loc: [25.2, 55.27] },
  { city: "Singapore", country: "Singapore", loc: [1.35, 103.82] },
  { city: "Sydney", country: "Australia", loc: [-33.87, 151.21] },
  { city: "Toronto", country: "Canada", loc: [43.65, -79.38] },
  { city: "Frankfurt", country: "Germany", loc: [50.11, 8.68] },
  { city: "Lagos", country: "Nigeria", loc: [6.52, 3.37] },
  { city: "São Paulo", country: "Brazil", loc: [-23.55, -46.63] },
];

export default function AuthGlobe({ size = 520 }) {
  const canvasRef = useRef(null);
  const pointer = useRef(null);
  const drag = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let phi = 4.4; // start with Europe / India / Middle East in view
    let globe;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi,
        theta: 0.28,
        dark: 1,
        diffuse: 1.15,
        mapSamples: 16000,
        mapBrightness: 5.5,
        baseColor: [0.32, 0.33, 0.36],
        markerColor: [0.93, 0.94, 0.96],
        glowColor: [0.16, 0.16, 0.18],
        markers: TRADER_LOCATIONS.map((m) => ({ location: m.loc, size: 0.05 })),
        onRender: (state) => {
          if (!reduce && !pointer.current && !document.hidden) phi += 0.0028;
          state.phi = phi + drag.current;
        },
      });
    } catch {
      return undefined; // no WebGL: the panel still reads fine without the globe
    }
    requestAnimationFrame(() => { if (canvas) canvas.style.opacity = "1"; });
    return () => globe?.destroy();
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        maxWidth: "100%",
        aspectRatio: "1",
        opacity: 0,
        transition: "opacity 1s ease",
        cursor: "grab",
        contain: "layout paint size",
      }}
      onPointerDown={(e) => { pointer.current = e.clientX - drag.current * 200; e.currentTarget.style.cursor = "grabbing"; }}
      onPointerUp={(e) => { pointer.current = null; e.currentTarget.style.cursor = "grab"; }}
      onPointerOut={(e) => { pointer.current = null; e.currentTarget.style.cursor = "grab"; }}
      onPointerMove={(e) => { if (pointer.current !== null) drag.current = (e.clientX - pointer.current) / 200; }}
    />
  );
}
