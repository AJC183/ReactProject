// ─── ErrorState ───────────────────────────────────────────────────────────────
// Reusable themed error display. Two variants:
//   - inline: compact, single-line, tight padding — good alongside form fields
//   - banner: full-width card with optional "Try again" retry button
// Announces itself via accessibilityRole="alert" so screen readers pick it up.

import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';

type Props = {
  message:   string;
  variant?:  'inline' | 'banner';
  onRetry?:  () => void;
  retryLabel?: string;
  icon?:     keyof typeof Ionicons.glyphMap;
};

export default function ErrorState({
  message,
  variant    = 'inline',
  onRetry,
  retryLabel = 'Try again',
  icon       = 'alert-circle',
}: Props) {
  const { theme } = useAppTheme();
  const styles    = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.base,
        variant === 'banner' ? styles.banner : styles.inline,
      ]}
    >
      <Ionicons
        name={icon}
        size={variant === 'banner' ? 18 : 15}
        color={theme.danger}
        style={styles.icon}
      />
      <Text style={styles.message} numberOfLines={variant === 'banner' ? 3 : 2}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.retryLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      alignItems:      'center',
      backgroundColor: theme.dangerDim,
      borderColor:     theme.danger + '40',
      borderRadius:    Radius.sm,
      borderWidth:     1,
      flexDirection:   'row',
    },
    inline: {
      gap:               8,
      paddingHorizontal: 10,
      paddingVertical:   8,
    },
    banner: {
      gap:               10,
      paddingHorizontal: Spacing.md,
      paddingVertical:   12,
    },
    icon: {
      marginTop: 1,
    },
    message: {
      color:    theme.danger,
      flex:     1,
      fontSize: Typography.captionSize + 1,
      fontWeight: '500',
      lineHeight: 18,
    },
    retry: {
      paddingHorizontal: 10,
      paddingVertical:   4,
    },
    retryLabel: {
      color:      theme.danger,
      fontSize:   Typography.captionSize,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
  });
}
