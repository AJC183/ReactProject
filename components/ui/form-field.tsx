// ─── FormField ────────────────────────────────────────────────────────────────
// Themed labelled input with focus + error states, optional left icon, and a
// built-in password visibility toggle. All standard TextInput props pass
// through via `inputProps` so keyboard type, returnKeyType, autoComplete, etc.
// can be set at the call site. Supports ref forwarding for focus chaining.

import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';

export type FormFieldRef = {
  focus: () => void;
  blur:  () => void;
};

type Props = {
  label:         string;
  value:         string;
  onChangeText:  (text: string) => void;
  placeholder?:  string;
  secureTextEntry?: boolean;
  error?:        string;
  leftIcon?:     keyof typeof Ionicons.glyphMap;
  editable?:     boolean;
  accessibilityHint?: string;
  /** Everything else: keyboardType, autoComplete, returnKeyType, onSubmitEditing, etc. */
  inputProps?:   Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry' | 'editable' | 'style'>;
};

const FormField = forwardRef<FormFieldRef, Props>(function FormField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    error,
    leftIcon,
    editable = true,
    accessibilityHint,
    inputProps,
  },
  ref,
) {
  const { theme } = useAppTheme();
  const styles    = useMemo(() => makeStyles(theme), [theme]);

  const inputRef                = useRef<TextInput>(null);
  const [focused, setFocused]   = useState(false);
  const [hidden,  setHidden]    = useState(secureTextEntry);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur:  () => inputRef.current?.blur(),
  }));

  const borderColor = error
    ? theme.danger
    : focused
      ? theme.inputBorderFocus
      : theme.inputBorder;

  const handleFocus = () => {
    setFocused(true);
    Haptics.selectionAsync().catch(() => {});
  };

  const toggleHidden = () => {
    setHidden(h => !h);
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <View style={[styles.inputRow, { borderColor }, !editable && styles.disabledRow]}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={16}
            color={focused ? theme.primaryLight : theme.textTertiary}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={theme.textTertiary}
          secureTextEntry={secureTextEntry && hidden}
          editable={editable}
          onFocus={handleFocus}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: theme.textPrimary }]}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          {...inputProps}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={toggleHidden}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          style={styles.errorText}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export default FormField;

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: Spacing.md,
    },
    label: {
      color:          theme.textTertiary,
      fontSize:       Typography.labelSize,
      fontWeight:     Typography.labelWeight,
      letterSpacing:  Typography.labelTracking,
      marginBottom:   6,
    },
    inputRow: {
      alignItems:      'center',
      backgroundColor: theme.inputBackground,
      borderRadius:    Radius.md,
      borderWidth:     1,
      flexDirection:   'row',
      paddingHorizontal: Spacing.md,
    },
    disabledRow: {
      opacity: 0.6,
    },
    leftIcon: {
      marginRight: 8,
    },
    input: {
      flex:            1,
      fontSize:        Typography.bodySize,
      paddingVertical: 12,
    },
    eyeBtn: {
      paddingHorizontal: 4,
      paddingVertical:   4,
    },
    errorText: {
      color:     theme.danger,
      fontSize:  Typography.captionSize,
      marginTop: 6,
    },
  });
}
