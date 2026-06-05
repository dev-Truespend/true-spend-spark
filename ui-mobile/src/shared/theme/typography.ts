import { Platform } from "react-native";

export const typography = {
  fontFamily: Platform.select({ ios: "System", android: "Roboto", default: "System" }) ?? "System",
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const
  },
  lineHeight: {
    tight: 18,
    normal: 22,
    relaxed: 26
  }
};

export type Typography = typeof typography;
