/* Poppins typography helper — maps a numeric/string fontWeight to the matching
   Poppins variant so weights render correctly on both platforms. */
export const POPPINS = {
  400: "Poppins_400Regular",
  500: "Poppins_500Medium",
  600: "Poppins_600SemiBold",
  700: "Poppins_700Bold",
  800: "Poppins_800ExtraBold",
};

export function font(weight = 400) {
  const w = typeof weight === "string" ? parseInt(weight, 10) || 400 : weight;
  if (w >= 800) return POPPINS[800];
  if (w >= 700) return POPPINS[700];
  if (w >= 600) return POPPINS[600];
  if (w >= 500) return POPPINS[500];
  return POPPINS[400];
}

/* convenience: a text style object with the right Poppins family for a weight */
export const type = (weight = 400, size, extra = {}) => ({
  fontFamily: font(weight),
  ...(size ? { fontSize: size } : {}),
  ...extra,
});
