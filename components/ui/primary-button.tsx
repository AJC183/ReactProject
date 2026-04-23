// ─── PrimaryButton ────────────────────────────────────────────────────────────
// Themed pressable used across the app. Supports primary / secondary / danger
// variants, a compact size, loading spinner, disabled state, and an optional
// left icon. Backwards-compatible with the earlier API — new props are all
// optional.

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  compact?: boolean;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export default function PrimaryButton({
  label,
  onPress,
  compact = false,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const isDisabled = disabled || loading;

  // Colour per variant — resolved up-front so we can reuse for icon/spinner.
  const background =
    variant === 'secondary'
      ? 'transparent'
      : variant === 'danger'
        ? theme.danger
        : theme.primary;

  const borderColor =
    variant === 'secondary' ? theme.border : 'transparent';

  const foreground =
    variant === 'secondary' ? theme.textPrimary : theme.textInverse;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor,
          borderWidth:     variant === 'secondary' ? 1 : 0,
        },
        compact && styles.compact,
        pressed  && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={foreground}
            style={styles.spinner}
          />
        ) : leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={compact ? 14 : 16}
            color={foreground}
            style={styles.icon}
          />
        ) : null}

        <Text
          style={[
            styles.label,
            { color: foreground },
            compact && styles.compactLabel,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    button: {
      alignItems:        'center',
      borderRadius:      Radius.md,
      justifyContent:    'center',
      paddingHorizontal: Spacing.md,
      paddingVertical:   13,
    },
    inner: {
      alignItems:     'center',
      flexDirection:  'row',
      justifyContent: 'center',
    },
    compact: {
      alignSelf:         'flex-start',
      marginTop:         Spacing.sm,
      paddingHorizontal: 12,
      paddingVertical:   8,
    },
    pressed: {
      opacity:   0.88,
      transform: [{ translateY: 1 }],
    },
    disabled: {
      opacity: 0.55,
    },
    label: {
      fontSize:   Typography.bodySize,
      fontWeight: '600',
    },
    compactLabel: {
      fontSize: Typography.captionSize + 1,
    },
    icon: {
      marginRight: 8,
    },
    spinner: {
      marginRight: 8,
    },
  });
}
