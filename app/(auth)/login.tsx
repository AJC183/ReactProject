import PrimaryButton from '@/components/ui/primary-button';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { useAuth } from '@/app/_layout';
import { sha256 } from '@/utils/hash';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { eq } from 'drizzle-orm';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
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
        return;
      }

      const hashed = sha256(password);
      if (hashed !== user.password) {
        setError('Incorrect password.');
        return;
      }

      login({ id: user.id, username: user.username, email: user.email, createdAt: user.createdAt });
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Loop wordmark */}
      <View style={styles.wordmarkRow}>
        <Text style={styles.wordmark}>Loop</Text>
        <Text style={styles.wordmarkDot}>.</Text>
      </View>
      <Text style={styles.tagline}>Build habits that stick.</Text>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Sign in to continue.</Text>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <PrimaryButton label={loading ? 'Signing in…' : 'Sign In'} onPress={handleLogin} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
          <Text style={styles.footerLink}>Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.background,
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  // Wordmark
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  wordmark: {
    color: Colors.textPrimary,
    fontSize: Typography.displaySize,
    fontWeight: Typography.displayWeight,
    letterSpacing: -1,
    lineHeight: Typography.displaySize,
  },
  wordmarkDot: {
    color: Colors.primaryLight,
    fontSize: Typography.displaySize,
    fontWeight: Typography.displayWeight,
    lineHeight: Typography.displaySize,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: Typography.bodySize,
    marginBottom: Spacing.xxl,
  },
  // Form section
  formTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.titleSize,
    fontWeight: Typography.titleWeight,
    marginBottom: 4,
  },
  formSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.bodySize,
    marginBottom: Spacing.lg,
  },
  form: {
    marginBottom: Spacing.md,
  },
  fieldWrapper: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.labelSize,
    fontWeight: Typography.labelWeight,
    letterSpacing: Typography.labelTracking,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: Typography.bodySize,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  error: {
    color: Colors.danger,
    fontSize: Typography.captionSize,
    marginBottom: Spacing.sm,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
});
