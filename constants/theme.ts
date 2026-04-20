// ─── Loop Theme ───────────────────────────────────────────────────────────────
// Exports DarkTheme and LightTheme palettes plus a getTheme() helper.
// Screens should call useAppTheme() from app/_layout.tsx to get the live
// palette; the static `Colors` export is kept so untouched screens still
// compile without modification.

import { Platform } from 'react-native';

// ── Colour palettes ───────────────────────────────────────────────────────────

export const DarkTheme = {
  // Backgrounds
  background:       '#0A0A12',
  surface:          '#13131F',
  surfaceElevated:  '#1C1C2E',
  border:           '#2A2A3D',

  // Purple — primary brand
  primary:          '#7C3AED',
  primaryLight:     '#A78BFA',
  primaryDim:       '#7C3AED26',

  // Mint — accent / success
  accent:           '#10B981',
  accentLight:      '#34D399',
  accentDim:        '#10B98120',

  // Semantic
  success:          '#22C55E',
  warning:          '#F59E0B',
  danger:           '#EF4444',
  dangerDim:        '#EF444420',

  // Text
  textPrimary:      '#F0EDFF',
  textSecondary:    '#9B97B2',
  textTertiary:     '#4B4870',
  textInverse:      '#FFFFFF',

  // Tab bar
  tabBarBackground: '#0F0F1A',
  tabBarActive:     '#A78BFA',
  tabBarInactive:   '#3D3A5C',
  tabBarBorder:     '#1E1E30',

  // Input fields
  inputBackground:  '#13131F',
  inputBorder:      '#2A2A3D',
  inputBorderFocus: '#7C3AED',
} as const;

export const LightTheme = {
  // Backgrounds
  background:       '#F5F4FF',
  surface:          '#FFFFFF',
  surfaceElevated:  '#EDE9FE',
  border:           '#DDD6FE',

  // Purple — primary brand (same hue, slightly richer for light bg)
  primary:          '#7C3AED',
  primaryLight:     '#6D28D9',
  primaryDim:       '#7C3AED18',

  // Mint — accent / success
  accent:           '#059669',
  accentLight:      '#10B981',
  accentDim:        '#10B98118',

  // Semantic
  success:          '#16A34A',
  warning:          '#D97706',
  danger:           '#DC2626',
  dangerDim:        '#DC262618',

  // Text
  textPrimary:      '#1E1B4B',
  textSecondary:    '#4C4580',
  textTertiary:     '#9E99C0',
  textInverse:      '#FFFFFF',

  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarActive:     '#7C3AED',
  tabBarInactive:   '#9E99C0',
  tabBarBorder:     '#E5E3F5',

  // Input fields
  inputBackground:  '#FFFFFF',
  inputBorder:      '#DDD6FE',
  inputBorderFocus: '#7C3AED',
} as const;

// ── Type alias ────────────────────────────────────────────────────────────────

export type AppTheme = typeof DarkTheme;

// ── Helper ────────────────────────────────────────────────────────────────────

export function getTheme(isDark: boolean): AppTheme {
  return isDark ? DarkTheme : LightTheme;
}

// ── Backwards-compat default export ──────────────────────────────────────────
// Screens that have not yet been migrated still import `Colors` and get the
// dark palette.  Once a screen is migrated it reads from ThemeContext instead.

export const Colors = DarkTheme;

// ── Typography ────────────────────────────────────────────────────────────────

export const Typography = {
  displaySize:    42,
  displayWeight:  '800' as const,
  titleSize:      28,
  titleWeight:    '800' as const,
  headingSize:    17,
  headingWeight:  '700' as const,
  bodySize:       15,
  bodyWeight:     '400' as const,
  captionSize:    12,
  captionWeight:  '500' as const,
  labelSize:      11,
  labelWeight:    '700' as const,
  labelTracking:  1.2,
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  14,
  lg:  20,
  xl:  28,
  xxl: 40,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 100,
} as const;

// ── Fonts ─────────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
