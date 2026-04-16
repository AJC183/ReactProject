// ─── Loop Theme ───────────────────────────────────────────────────────────────
// Dark premium palette for the Loop habit tracker.
// Import these tokens in any screen instead of hardcoding hex values.

import { Platform } from 'react-native';

// ── Colours ───────────────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  background:       '#0A0A12', // deepest app background
  surface:          '#13131F', // card / panel surface
  surfaceElevated:  '#1C1C2E', // modals, elevated sheets
  border:           '#2A2A3D', // card borders, dividers

  // Purple — primary brand
  primary:          '#7C3AED', // vivid violet
  primaryLight:     '#A78BFA', // lighter violet for text / active icons
  primaryDim:       '#7C3AED26', // ~15 % alpha — chip / selected backgrounds

  // Mint — accent / success
  accent:           '#10B981', // emerald mint (kept for habits & logs)
  accentLight:      '#34D399', // lighter mint for labels on dark bg
  accentDim:        '#10B98120', // ~12 % alpha — success state backgrounds

  // Semantic
  success:          '#22C55E',
  warning:          '#F59E0B',
  danger:           '#EF4444',
  dangerDim:        '#EF444420',

  // Text
  textPrimary:      '#F0EDFF', // near-white with a violet tint
  textSecondary:    '#9B97B2', // muted body / subtitles
  textTertiary:     '#4B4870', // placeholders, disabled states
  textInverse:      '#FFFFFF',

  // Tab bar
  tabBarBackground: '#0F0F1A',
  tabBarActive:     '#A78BFA', // primaryLight — pops on dark bg
  tabBarInactive:   '#3D3A5C',
  tabBarBorder:     '#1E1E30',

  // Input fields
  inputBackground:  '#13131F',
  inputBorder:      '#2A2A3D',
  inputBorderFocus: '#7C3AED',
} as const;

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

// ── Fonts (preserved for any existing usages) ─────────────────────────────────

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
