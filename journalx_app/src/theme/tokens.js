/* Design tokens ported from the web app (styles/tokens.css) into a RN theme.
   Two palettes (light / dark) + shared spacing, radii and typography. */

export const yellow = {
  50: "#fef8e1",
  100: "#fcefc0",
  200: "#f8de85",
  300: "#fcd535",
  400: "#f0b90b",
  500: "#c99400",
  600: "#fcd535", // brand text accent (matches the web change)
};

/* Gradients shared by both palettes — built strictly from the existing brand
   colours (yellow #fcd535/#f0b90b, success #2ebd85, danger #f6465d). */
const sharedGradients = {
  brand: ["#fcd535", "#f0b90b"],
  brandStrong: ["#f8de85", "#fcd535", "#f0b90b"],
  success: ["#2ebd85", "#1a9e6e"],
  danger: ["#f6465d", "#e23048"],
};

const shared = {
  yellow,
  brand: "#fcd535",
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  font: {
    caption: 12,
    small: 13,
    body: 14,
    bodyMd: 15,
    title: 17,
    h3: 20,
    h2: 26,
    h1: 32,
    stat: 30,
  },
  success: "#2ebd85",
  successStrong: "#1a9e6e",
  danger: "#f6465d",
  dangerStrong: "#e23048",
};

export const lightTheme = {
  ...shared,
  mode: "light",
  bg: {
    canvas: "#f7f8fa",
    surface: "#ffffff",
    elevated: "#ffffff",
    muted: "#f0f1f3",
  },
  border: "#e6e8eb",
  borderStrong: "#d0d3d8",
  text: {
    primary: "#12161c",
    secondary: "#3b424d",
    muted: "#707a8a",
    inverse: "#ffffff",
  },
  primary: "#fcd535",
  primaryText: "#1e2329",
  primarySubtle: "rgba(252,213,53,0.14)",
  successSubtle: "rgba(46,189,133,0.12)",
  dangerSubtle: "rgba(246,70,93,0.12)",
  // readable brand accent for badges/text on LIGHT surfaces (dark gold + warm tint)
  accent: { text: "#8a6300", subtle: "rgba(240,185,11,0.20)", border: "rgba(201,148,0,0.40)" },
  // solid surfaces (clean, non-glass) — kept under `glass.*` for API stability
  glass: {
    surface: "#ffffff",
    surfaceStrong: "#ffffff",
    input: "#f0f1f3",
    border: "#e6e8eb",
    highlight: "transparent",
    blurTint: "light",
    blurIntensity: 0,
  },
  gradients: {
    ...sharedGradients,
    canvas: ["#f7f8fa", "#eef1f6", "#f7f8fa"],
    sheen: ["rgba(255,255,255,0.70)", "rgba(255,255,255,0)"],
    blobBrand: ["rgba(252,213,53,0.32)", "rgba(252,213,53,0)"],
    blobSuccess: ["rgba(46,189,133,0.18)", "rgba(46,189,133,0)"],
    blobDanger: ["rgba(246,70,93,0.14)", "rgba(246,70,93,0)"],
    statBrand: ["rgba(252,213,53,0.22)", "rgba(240,185,11,0.05)"],
    statSuccess: ["rgba(46,189,133,0.16)", "rgba(46,189,133,0.03)"],
    statDanger: ["rgba(246,70,93,0.16)", "rgba(246,70,93,0.03)"],
  },
};

export const darkTheme = {
  ...shared,
  mode: "dark",
  bg: {
    canvas: "#0d1117",
    surface: "#161a20",
    elevated: "#1c222b",
    muted: "#222831",
  },
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.18)",
  text: {
    primary: "#ffffff",
    secondary: "#d6dae0",
    muted: "#aeb4bc",
    inverse: "#12161c",
  },
  primary: "#fcd535",
  primaryText: "#1e2329",
  primarySubtle: "rgba(252,213,53,0.12)",
  successSubtle: "rgba(46,189,133,0.14)",
  dangerSubtle: "rgba(246,70,93,0.14)",
  // brand accent on DARK surfaces — bright yellow reads well here
  accent: { text: "#fcd535", subtle: "rgba(252,213,53,0.18)", border: "rgba(252,213,53,0.45)" },
  // solid surfaces (clean, non-glass) — kept under `glass.*` for API stability
  glass: {
    surface: "#161a20",
    surfaceStrong: "#1c222b",
    input: "#222831",
    border: "rgba(255,255,255,0.08)",
    highlight: "transparent",
    blurTint: "dark",
    blurIntensity: 0,
  },
  gradients: {
    ...sharedGradients,
    canvas: ["#0d1117", "#11161f", "#0d1117"],
    sheen: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0)"],
    blobBrand: ["rgba(252,213,53,0.20)", "rgba(252,213,53,0)"],
    blobSuccess: ["rgba(46,189,133,0.16)", "rgba(46,189,133,0)"],
    blobDanger: ["rgba(246,70,93,0.12)", "rgba(246,70,93,0)"],
    statBrand: ["rgba(252,213,53,0.16)", "rgba(240,185,11,0.03)"],
    statSuccess: ["rgba(46,189,133,0.18)", "rgba(46,189,133,0.04)"],
    statDanger: ["rgba(246,70,93,0.18)", "rgba(246,70,93,0.04)"],
  },
};

export const getTheme = (mode) => (mode === "light" ? lightTheme : darkTheme);
