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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <ScreenHeader title="Welcome back" subtitle="Sign in to continue." />

      <View style={styles.form}>
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
            placeholder="Password"
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
