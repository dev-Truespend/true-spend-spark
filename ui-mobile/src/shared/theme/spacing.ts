export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

// Border radius scale taken from the mockup (6 → 22). `sm = 8` matches the
// most common 8px corners (.bank-row, .form-row .input, .chip).
export const radii = {
  xxs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  hero: 22,
  pill: 9999
} as const;
