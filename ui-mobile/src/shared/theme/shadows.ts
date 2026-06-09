import { Platform, ViewStyle } from "react-native";

// Mockup uses three shadow registers: card (subtle), elevated (cards/modals),
// and brand (gradient hero CTAs / buttons with colored glow).
const ios = (
  color: string,
  opacity: number,
  radius: number,
  offsetY: number
): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: offsetY }
});

const android = (elevation: number): ViewStyle => ({ elevation });

export const shadows = {
  card: Platform.select({
    ios: ios("#0B1220", 0.06, 6, 2),
    android: android(2),
    default: {}
  }) as ViewStyle,
  elevated: Platform.select({
    ios: ios("#0B1220", 0.1, 14, 6),
    android: android(6),
    default: {}
  }) as ViewStyle,
  brandBlue: Platform.select({
    ios: ios("#377DF6", 0.4, 18, 10),
    android: android(8),
    default: {}
  }) as ViewStyle,
  brandPurple: Platform.select({
    ios: ios("#9B34EA", 0.35, 18, 10),
    android: android(8),
    default: {}
  }) as ViewStyle,
  brandWarm: Platform.select({
    ios: ios("#F5930A", 0.35, 18, 10),
    android: android(8),
    default: {}
  }) as ViewStyle,
  fab: Platform.select({
    ios: ios("#377DF6", 0.45, 22, 12),
    android: android(10),
    default: {}
  }) as ViewStyle
};

export type ShadowName = keyof typeof shadows;
