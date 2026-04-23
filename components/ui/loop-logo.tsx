// ─── LoopLogo ─────────────────────────────────────────────────────────────────
// Brand mark for Loop. Pure React Native (no react-native-svg dependency) —
// a circular ring built from a bordered View with a small offset dot that
// breaks the loop, evoking a habit cycle. Reused on login, register, and
// profile screens. Colours come from the theme so it adapts to dark / light.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/app/_layout';
import { AppTheme, Typography } from '@/constants/theme';

type Props = {
  size?:          number;                         // ring diameter in px
  showWordmark?:  boolean;
  wordmarkSize?:  'sm' | 'md' | 'lg';
  layout?:        'horizontal' | 'stacked';
  tone?:          'primary' | 'onSurface';        // onSurface keeps text muted
};

const WORDMARK_SIZES: Record<NonNullable<Props['wordmarkSize']>, number> = {
  sm: Typography.headingSize,
  md: Typography.titleSize,
  lg: Typography.displaySize,
};

export default function LoopLogo({
  size         = 44,
  showWordmark = true,
  wordmarkSize = 'lg',
  layout       = 'horizontal',
  tone         = 'primary',
}: Props) {
  const { theme } = useAppTheme();
  const styles    = useMemo(() => makeStyles(theme), [theme]);

  const ringColor = tone === 'primary' ? theme.primary : theme.textPrimary;
  const dotColor  = theme.primaryLight;
  const wordColor = tone === 'primary' ? theme.textPrimary : theme.textSecondary;

  const ringThickness = Math.max(3, Math.round(size * 0.11));
  const dotSize       = Math.max(6, Math.round(size * 0.22));

  const fontSize = WORDMARK_SIZES[wordmarkSize];

  return (
    <View
      style={[styles.container, layout === 'stacked' && styles.stacked]}
      accessibilityRole="image"
      accessibilityLabel="Loop"
    >
      {/* Ring + offset dot */}
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width:        size,
            height:       size,
            borderRadius: size / 2,
            borderWidth:  ringThickness,
            borderColor:  ringColor,
          }}
        />
        <View
          style={{
            position:        'absolute',
            top:             -dotSize / 3,
            right:           -dotSize / 3,
            width:           dotSize,
            height:          dotSize,
            borderRadius:    dotSize / 2,
            backgroundColor: dotColor,
          }}
        />
      </View>

      {showWordmark ? (
        <Text
          style={[
            styles.wordmark,
            {
              color:      wordColor,
              fontSize,
              lineHeight: fontSize,
              marginLeft: layout === 'horizontal' ? 12 : 0,
              marginTop:  layout === 'stacked'    ? 10 : 0,
            },
          ]}
        >
          Loop
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(_theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems:    'center',
      flexDirection: 'row',
    },
    stacked: {
      flexDirection: 'column',
    },
    wordmark: {
      fontWeight:    Typography.displayWeight,
      letterSpacing: -1,
    },
  });
}
