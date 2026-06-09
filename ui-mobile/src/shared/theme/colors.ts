// Brand palette mirrors _docs/MobileApp-Mockup/css/style.css (HSL → hex).
// Light tokens are the existing values. Dark tokens are new.
// `colors` / `palette` / `tints` / `gradients` are LIGHT-mode static exports —
// they remain the source of truth for any file that has not yet migrated to
// `useTheme()`. Migrated files import `useTheme()` and read `theme.colors`
// (etc.) from there, which switches automatically with the resolved scheme.

export type Scheme = "light" | "dark";

export const palette = {
  // Brand
  brandBlue: "#377DF6",
  brandBlueDark: "#2C66D6",
  brandPurple: "#9B34EA",
  brandTeal: "#1884A5",
  brandTealGradient: "#1DA1C9",
  brandAmber: "#F5930A",
  brandAmberText: "#B96A06",
  success: "#22C55E",
  successText: "#15803D",

  // Neutrals
  white: "#FFFFFF",
  black: "#000000",
  bg: "#F1F4F9",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  text: "#0B1220",
  textInverse: "#FFFFFF",
  mutedFg: "#647489",
  destructive: "#EF4444"
} as const;

const paletteDark = {
  // Brand — slightly brighter to read on dark surfaces
  brandBlue: "#5B8DEF",
  brandBlueDark: "#3A6CD8",
  brandPurple: "#B056F0",
  brandTeal: "#34B8DA",
  brandTealGradient: "#3DC2DD",
  brandAmber: "#F5A623",
  brandAmberText: "#F4B860",
  success: "#34D399",
  successText: "#86EFAC",

  // Neutrals
  white: "#FFFFFF",
  black: "#000000",
  bg: "#0B0F14",
  surface: "#161B22",
  surfaceAlt: "#1F2937",
  border: "#1F2937",
  borderStrong: "#334155",
  text: "#F1F5F9",
  textInverse: "#0B1220",
  mutedFg: "#94A3B8",
  destructive: "#F87171"
} as const;

type PaletteShape = { [K in keyof typeof palette]: string };

function buildColors(p: PaletteShape) {
  return {
    background: p.bg,
    surface: p.surface,
    text: p.text,
    muted: p.mutedFg,
    border: p.border,
    primary: p.brandBlue,
    primaryText: p.white,
    danger: p.destructive,

    primaryDark: p.brandBlueDark,
    accent: p.brandPurple,
    teal: p.brandTeal,
    amber: p.brandAmber,
    amberText: p.brandAmberText,
    success: p.success,
    successText: p.successText,
    surfaceAlt: p.surfaceAlt,
    borderStrong: p.borderStrong,
    white: p.white,
    black: p.black,
    textInverse: p.textInverse,
    destructive: p.destructive,
    mutedFg: p.mutedFg,
    overlay: "rgba(11, 18, 32, 0.55)",

    onBrandStrong: "rgba(255,255,255,0.95)",
    onBrandSoft: "rgba(255,255,255,0.88)",
    onBrandMuted: "rgba(255,255,255,0.85)",
    onBrandSurface: "rgba(255,255,255,0.22)",
    onBrandBorder: "rgba(255,255,255,0.30)",

    onLightStrong: "rgba(11,18,32,0.85)",
    onLightSoft: "rgba(11,18,32,0.55)",
    onLightHint: "rgba(11,18,32,0.45)"
  } as const;
}

// Back-compat semantic names. DO NOT remove keys — many call sites depend on them.
export const colors = buildColors(palette);
export const colorsDark = buildColors(paletteDark);
export const palettesByScheme = { light: palette, dark: paletteDark } as const;
export const colorsByScheme = { light: colors, dark: colorsDark } as const;

function buildGradients(p: PaletteShape) {
  return {
    brand: [p.brandBlue, p.brandPurple] as const,
    warm: ["#F8A024", "#EF4444"] as const,
    cool: [p.brandTealGradient, p.brandBlue] as const,
    dark: ["#0E1B33", "#1E4DA8"] as const,
    gold: ["#F4C13A", "#D87F0F"] as const,
    purple: [p.brandPurple, p.brandBlue] as const,
    splash: [p.brandBlue, p.brandPurple] as const,
    blueWash: ["rgba(55, 125, 246, 0.12)", "rgba(155, 52, 234, 0.12)"] as const,
    warmWash: ["rgba(245, 147, 10, 0.14)", "rgba(239, 68, 68, 0.14)"] as const,
    goldWash: ["rgba(244, 193, 58, 0.14)", "rgba(216, 127, 15, 0.14)"] as const
  } as const;
}

export const gradients = buildGradients(palette);
export const gradientsDark = buildGradients(paletteDark);
export const gradientsByScheme = { light: gradients, dark: gradientsDark } as const;

export type GradientName = keyof typeof gradients;

function buildTints(p: PaletteShape) {
  return {
    blue:   { bg: "rgba(55, 125, 246, 0.12)",  wash: "rgba(55, 125, 246, 0.06)",  border: "rgba(55, 125, 246, 0.25)",  fg: p.brandBlue },
    purple: { bg: "rgba(155, 52, 234, 0.12)",  wash: "rgba(155, 52, 234, 0.06)",  border: "rgba(155, 52, 234, 0.25)",  fg: p.brandPurple },
    teal:   { bg: "rgba(24, 132, 165, 0.12)",  wash: "rgba(24, 132, 165, 0.06)",  border: "rgba(24, 132, 165, 0.25)",  fg: p.brandTeal },
    amber:  { bg: "rgba(245, 147, 10, 0.14)",  wash: "rgba(245, 147, 10, 0.06)",  border: "rgba(245, 147, 10, 0.30)",  fg: p.brandAmberText },
    red:    { bg: "rgba(239, 68, 68, 0.12)",   wash: "rgba(239, 68, 68, 0.06)",   border: "rgba(239, 68, 68, 0.25)",   fg: p.destructive },
    green:  { bg: "rgba(34, 197, 94, 0.12)",   wash: "rgba(34, 197, 94, 0.06)",   border: "rgba(34, 197, 94, 0.25)",   fg: p.successText },
    gold:   { bg: "rgba(244, 193, 58, 0.14)",  wash: "rgba(244, 193, 58, 0.06)",  border: "rgba(244, 193, 58, 0.40)",  fg: p.brandAmberText },
    muted:  { bg: p.surfaceAlt,                wash: p.surfaceAlt,                border: p.border,                    fg: p.text }
  } as const;
}

export const tints = buildTints(palette);
export const tintsDark = buildTints(paletteDark);
export const tintsByScheme = { light: tints, dark: tintsDark } as const;

export type TintName = keyof typeof tints;
