import PrimaryButton from '@/components/ui/primary-button';
import ScreenHeader from '@/components/ui/screen-header';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { useAuth } from '@/app/_layout';
import { eq } from 'drizzle-orm';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await db.delete(users).where(eq(users.id, user.id));
              logout();
            } catch (e) {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Profile" subtitle="Manage your account." />

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Username</Text>
          <Text style={styles.rowValue}>{user.username}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user.email}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Member since</Text>
          <Text style={styles.rowValue}>{user.createdAt}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Sign Out" variant="secondary" onPress={handleLogout} />
        <View style={styles.dangerButton}>
          <PrimaryButton
            label={deleting ? 'Deleting…' : 'Delete Account'}
            variant="danger"
            onPress={handleDeleteAccount}
          />
        </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  rowValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  divider: {
    backgroundColor: '#F3F4F6',
    height: 1,
  },
  actions: {
    gap: 10,
  },
  dangerButton: {
    marginTop: 2,
  },
});
