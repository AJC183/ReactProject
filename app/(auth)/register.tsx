import PrimaryButton from '@/components/ui/primary-button';
import ScreenHeader from '@/components/ui/screen-header';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { useAuth } from '@/app/_layout';
import { sha256 } from '@/utils/hash';
import { eq } from 'drizzle-orm';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      const hashed = sha256(password);
      const createdAt = new Date().toISOString().split('T')[0];

      const [newUser] = await db
        .insert(users)
        .values({
          username: username.trim(),
          email: email.trim().toLowerCase(),
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
      <ScreenHeader title="Create account" subtitle="Start tracking your habits today." />

      <View style={styles.form}>
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            secureTextEntry
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <PrimaryButton label={loading ? 'Creating account…' : 'Create Account'} onPress={handleRegister} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.footerLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    padding: 20,
  },
  form: {
    marginBottom: 6,
  },
  fieldWrapper: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: '#B91C1C',
    fontSize: 13,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '600',
  },
});
