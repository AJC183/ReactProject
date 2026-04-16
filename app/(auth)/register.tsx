import PrimaryButton from '@/components/ui/primary-button';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { useAuth } from '@/app/_layout';
import { sha256 } from '@/utils/hash';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { eq } from 'drizzle-orm';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  const handleRegister = async () => {
    setError('');

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));

      if (existing.length > 0) {
        setError('An account with that email already exists.');
        return;
      }

      const hashed    = sha256(password);
      const createdAt = new Date().toISOString().split('T')[0];

      const [newUser] = await db
        .insert(users)
        .values({
          username: username.trim(),
          email:    email.trim().toLowerCase(),
          password: hashed,
          createdAt,
        })
        .returning();

      login({ id: newUser.id, username: newUser.username, email: newUser.email, createdAt: newUser.createdAt });
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loop wordmark */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Loop</Text>
          <Text style={styles.wordmarkDot}>.</Text>
        </View>
        <Text style={styles.tagline}>Build habits that stick.</Text>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Create account</Text>
          <Text style={styles.formSubtitle}>Start tracking your habits today.</Text>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Your name"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

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
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <PrimaryButton
          label={loading ? 'Creating account…' : 'Create Account'}
          onPress={handleRegister}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
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
    marginBottom: Spacing.xl,
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
