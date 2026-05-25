/**
 * Design Tokens
 * Central source of truth for design decisions across all platforms
 */

// Brand Colors
export const brandColors = {
  blue: '#3882F6',      // Primary Blue - HSL: 218, 91%, 59%
  purple: '#9333EA',    // Primary Purple - HSL: 274, 81%, 56%
  teal: '#1488A6',      // Accent Teal - HSL: 194, 75%, 37%
  gradient: 'linear-gradient(135deg, #3882F6 0%, #9333EA 100%)',
} as const;

// Spacing System (4px grid)
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
} as const;

// Breakpoints
export const breakpoints = {
  mobile: '0px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px',
} as const;

// Typography Scale
export const typography = {
  mobile: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
  },
  desktop: {
    xs: '0.875rem',  // 14px
    sm: '1rem',      // 16px
    base: '1.125rem',// 18px
    lg: '1.25rem',   // 20px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
  },
} as const;

// Component Sizing
export const sizes = {
  sm: { height: '2rem', padding: '0.5rem 0.75rem' },   // 32px height
  md: { height: '2.5rem', padding: '0.625rem 1rem' },  // 40px height
  lg: { height: '3rem', padding: '0.75rem 1.5rem' },   // 48px height
  xl: { height: '3.5rem', padding: '1rem 2rem' },      // 56px height
} as const;

// Touch Targets (WCAG AAA compliant)
export const touchTargets = {
  minimum: '44px',      // iOS/Android minimum
  comfortable: '48px',  // Recommended
  large: '56px',        // For primary actions
} as const;

// Platform-Specific Configurations
export const platform = {
  extension: {
    maxWidth: '396px',
    minHeight: '500px',
    compact: true,
    popupPadding: spacing.md,
  },
  mobile: {
    bottomNavHeight: '64px',
    touchTarget: touchTargets.comfortable,
    bottomNav: true,
    swipeGestures: true,
  },
  web: {
    maxWidth: '1280px',
    sidebarWidth: '240px',
    sidebar: true,
    multiColumn: true,
  },
  native: {
    statusBarHeight: '44px',  // iOS standard
    safeAreaInsets: true,
    haptics: true,
    nativeAnimations: true,
  },
} as const;

// Animation Durations
export const animations = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  pageTransition: '400ms',
} as const;

// Z-Index Scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  full: '9999px',
} as const;

// Shadows - Premium System
export const shadows = {
  soft: '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
  medium: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
  large: '0 16px 48px -8px rgba(0, 0, 0, 0.16)',
  premium: '0 24px 64px -12px rgba(56, 130, 246, 0.15)',
  glow: '0 0 32px rgba(147, 51, 234, 0.25)',
} as const;

// Typography - Premium Fonts
export const fonts = {
  display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono: '"SF Mono", "Roboto Mono", monospace',
} as const;

// Export type helpers
export type Spacing = keyof typeof spacing;
export type Breakpoint = keyof typeof breakpoints;
export type Size = keyof typeof sizes;
export type Platform = keyof typeof platform;
