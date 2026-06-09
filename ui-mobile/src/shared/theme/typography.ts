import { Dimensions, Platform, TextStyle } from "react-native";

// Inter is loaded via @expo-google-fonts/inter in src/shared/theme/fonts.ts.
// Until fonts finish loading we fall back to the platform system font.
const inter = (weight: "regular" | "medium" | "semibold" | "bold" | "heavy") => {
  const map = {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    heavy: "Inter_800ExtraBold"
  } as const;
  return Platform.select({
    web: map[weight],
    default: map[weight]
  }) as string;
};

export const fontFamily = {
  regular: inter("regular"),
  medium: inter("medium"),
  semibold: inter("semibold"),
  bold: inter("bold"),
  heavy: inter("heavy"),
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) ?? "monospace"
} as const;

// Physical-size-aware font scaling.
// 393pt = iPhone 14/15/16 Pro (6.1") — our design baseline.
// Clamped to [0.95, 1.05]: SE doesn't shrink dramatically, Plus/Pro Max
// gets a gentle 5% bump so text feels proportional on bigger screens.
const SCREEN_WIDTH = Dimensions.get("window").width;
const BASE_WIDTH = 393;
const FONT_SCALE = Math.min(Math.max(SCREEN_WIDTH / BASE_WIDTH, 0.95), 1.05);

export function scaleFont(size: number): number {
  return Math.round(size * FONT_SCALE);
}

// Sizes are 1pt larger than the pre-merge baseline so body text reads more
// comfortably on every device. Apply scaleFont() so Pro Max devices render
// a further ~5% larger.
export const typography = {
  fontFamily: fontFamily.regular,
  size: {
    xxs: scaleFont(10),
    xs: scaleFont(13),
    sm: scaleFont(14),
    md: scaleFont(15),
    lg: scaleFont(17),
    xl: scaleFont(19),
    xxl: scaleFont(23),
    display: scaleFont(29)
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const
  },
  lineHeight: {
    tight: scaleFont(19),
    normal: scaleFont(23),
    relaxed: scaleFont(27)
  }
};

export type Typography = typeof typography;

// Pre-baked text styles matching the mockup's .phone-h1/.phone-h2/.phone-muted etc.
// All sizes pass through scaleFont() so they adapt to device width.
export const textStyles = {
  display: {
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(29),
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: scaleFont(34)
  } as TextStyle,
  h1: {
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(25),
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: scaleFont(29)
  } as TextStyle,
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: scaleFont(18),
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: scaleFont(23)
  } as TextStyle,
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: scaleFont(15),
    fontWeight: "600",
    lineHeight: scaleFont(21)
  } as TextStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(15),
    fontWeight: "400",
    lineHeight: scaleFont(21)
  } as TextStyle,
  bodyStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: scaleFont(15),
    fontWeight: "600",
    lineHeight: scaleFont(21)
  } as TextStyle,
  small: {
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(13),
    fontWeight: "400",
    lineHeight: scaleFont(17)
  } as TextStyle,
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(12),
    fontWeight: "500",
    lineHeight: scaleFont(15)
  } as TextStyle,
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: scaleFont(11),
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    lineHeight: scaleFont(14)
  } as TextStyle,
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: scaleFont(13),
    letterSpacing: 1.2
  } as TextStyle
};
