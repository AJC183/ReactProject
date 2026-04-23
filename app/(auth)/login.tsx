// ─── Login Screen ─────────────────────────────────────────────────────────────
// Premium themed auth entry. Uses the live theme palette, reusable brand mark,
// themed form fields with focus chaining, loading/disabled states, haptic
// feedback, entrance animations, and full accessibility labelling.

import { eq } from 'drizzle-orm';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme, useAuth } from '@/app/_layout';
import ErrorState from '@/components/ui/error-state';
import FormField, { FormFieldRef } from '@/components/ui/form-field';
import LoopLogo from '@/components/ui/loop-logo';
import PrimaryButton from '@/components/ui/primary-button';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { sha256 } from '@/utils/hash';

export default function LoginScreen() {
  const router     = useRouter();
  const { login }  = useAuth();
  const { theme }  = useAppTheme();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const passwordRef = useRef<FormFieldRef>(null);

  // Entrance animation — logo first, then form card.
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoY    = useRef(new Animated.Value(-8)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardY    = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(logoY,    { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 220, delay: 80, useNativeDriver: true }),
      Animated.timing(cardY,    { toValue: 0, duration: 220, delay: 80, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardY, logoFade, logoY]);

  const handleLogin = async () => {
    if (loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setLoading(true);
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));

      if (!user) {
        setError('No account found with that email.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }

      const hashed = sha256(password);
      if (hashed !== user.password) {
        setError('Incorrect password.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      login({
        id:        user.id,
        username:  user.username,
        email:     user.email,
        createdAt: user.createdAt,
      });
    } catch {
      setError('Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace('/(auth)/register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand ──────────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.brand,
              { opacity: logoFade, transform: [{ translateY: logoY }] },
            ]}
          >
            <LoopLogo size={52} wordmarkSize="lg" />
            <Text style={styles.tagline}>Build habits that stick.</Text>
            <View style={styles.brandRule} />
          </Animated.View>

          {/* ── Form card ─────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.card,
              { opacity: cardFade, transform: [{ translateY: cardY }] },
            ]}
          >
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue.</Text>

            <View style={styles.fields}>
              <FormField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                leftIcon="mail-outline"
                editable={!loading}
                accessibilityHint="Enter the email address for your Loop account"
                inputProps={{
                  keyboardType:   'email-address',
                  autoCapitalize: 'none',
                  autoCorrect:    false,
                  autoComplete:   'email',
                  textContentType: 'emailAddress',
                  returnKeyType:  'next',
                  onSubmitEditing: () => passwordRef.current?.focus(),
                  blurOnSubmit:   false,
                }}
              />

              <FormField
                ref={passwordRef}
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                leftIcon="lock-closed-outline"
                editable={!loading}
                accessibilityHint="Enter your password"
                inputProps={{
                  autoCapitalize: 'none',
                  autoCorrect:    false,
                  autoComplete:   'password',
                  textContentType: 'password',
                  returnKeyType:  'done',
                  onSubmitEditing: handleLogin,
                }}
              />

              {error ? (
                <View style={styles.errorWrap}>
                  <ErrorState message={error} variant="inline" />
                </View>
              ) : null}
            </View>

            <PrimaryButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              accessibilityLabel="Sign in to your account"
              accessibilityHint="Submits the login form"
            />
          </Animated.View>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Pressable
              onPress={goToRegister}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel="Go to registration"
            >
              {({ pressed }) => (
                <Text style={[styles.footerLink, pressed && styles.footerLinkPressed]}>
                  Register
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.background,
      flex:            1,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      alignItems:        'center',
      flexGrow:          1,
      justifyContent:    'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical:   Spacing.xl,
    },

    // Brand block
    brand: {
      alignItems:   'flex-start',
      alignSelf:    'stretch',
      marginBottom: Spacing.xl,
      maxWidth:     440,
      width:        '100%',
    },
    tagline: {
      color:         theme.textSecondary,
      fontSize:      Typography.bodySize,
      letterSpacing: 0.3,
      marginTop:     Spacing.md,
    },
    brandRule: {
      backgroundColor: theme.primaryDim,
      height:          1,
      marginTop:       Spacing.lg,
      width:           48,
    },

    // Form card
    card: {
      alignSelf:       'stretch',
      backgroundColor: theme.surface,
      borderColor:     theme.border,
      borderRadius:    Radius.lg,
      borderWidth:     1,
      maxWidth:        440,
      padding:         Spacing.lg,
      width:           '100%',
    },
    formTitle: {
      color:      theme.textPrimary,
      fontSize:   Typography.titleSize,
      fontWeight: Typography.titleWeight,
      marginBottom: 4,
    },
    formSubtitle: {
      color:        theme.textSecondary,
      fontSize:     Typography.bodySize,
      marginBottom: Spacing.lg,
    },
    fields: {
      marginBottom: Spacing.sm,
    },
    errorWrap: {
      marginBottom: Spacing.sm,
      marginTop:    4,
    },

    // Footer
    footer: {
      alignItems:     'center',
      alignSelf:      'stretch',
      flexDirection:  'row',
      justifyContent: 'center',
      marginTop:      Spacing.xl,
    },
    footerText: {
      color:    theme.textSecondary,
      fontSize: Typography.captionSize + 1,
    },
    footerLink: {
      color:      theme.primaryLight,
      fontSize:   Typography.captionSize + 1,
      fontWeight: '700',
    },
    footerLinkPressed: {
      opacity: 0.7,
    },
  });
}
