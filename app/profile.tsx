import { Ionicons } from '@expo/vector-icons';
import { eq } from 'drizzle-orm';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import PrimaryButton from '@/components/ui/primary-button';
import ScreenHeader from '@/components/ui/screen-header';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { useAuth } from '@/app/_layout';
import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';
import { exportHabitLogs } from '@/utils/exportCsv';

// ─── Styles factory ───────────────────────────────────────────────────────────

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.background,
      flex: 1,
      padding: Spacing.lg,
    },
    card: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.lg,
      borderWidth: 1,
      marginBottom: 24,
      paddingHorizontal: Spacing.md,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    rowLeft: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    rowLabel: {
      color: theme.textSecondary,
      fontSize: Typography.bodySize,
      fontWeight: '500',
    },
    rowValue: {
      color: theme.textPrimary,
      flexShrink: 1,
      fontSize: Typography.bodySize,
      fontWeight: '600',
      marginLeft: 12,
      textAlign: 'right',
    },
    divider: {
      backgroundColor: theme.border,
      height: 1,
    },
    backBtn: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
      alignSelf: 'flex-start',
      marginBottom: Spacing.md,
      paddingVertical: 4,
    },
    backLabel: {
      color: theme.primaryLight,
      fontSize: Typography.bodySize,
      fontWeight: '600',
    },
    sectionLabel: {
      color: theme.textTertiary,
      fontSize: Typography.labelSize,
      fontWeight: Typography.labelWeight,
      letterSpacing: Typography.labelTracking,
      marginBottom: Spacing.sm,
      marginTop: Spacing.lg,
      textTransform: 'uppercase',
    },
    actions: {
      gap: 10,
      marginTop: Spacing.sm,
    },
    dangerButton: {
      marginTop: 2,
    },
    toast: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 100,
      borderWidth: 1,
      bottom: 32,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      position: 'absolute',
    },
    toastText: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router                         = useRouter();
  const { user, logout }               = useAuth();
  const { isDark, theme, toggleTheme } = useAppTheme();
  const [deleting, setDeleting]        = useState(false);
  const [exporting, setExporting]      = useState(false);
  const [toast, setToast]              = useState({ message: '', visible: false, isError: false });

  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    Animated.timing(toastOpacity, {
      toValue:         toast.visible ? 1 : 0,
      duration:        200,
      useNativeDriver: true,
    }).start();
  }, [toast.visible]);

  if (!user) return null;

  const showToast = (message: string, isError = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, visible: true, isError });
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      2500,
    );
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportHabitLogs();
      showToast('Export ready!');
    } catch (err) {
      console.error('[Export] failed:', err);
      showToast('Export failed. Please try again.', true);
    } finally {
      setExporting(false);
    }
  };

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
            } catch {
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
      <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={18} color={theme.primaryLight} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <ScreenHeader title="Profile" subtitle="Manage your account." />

      {/* ── Account info ─────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Account</Text>
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

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Appearance</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons
              name={isDark ? 'moon-outline' : 'sunny-outline'}
              size={18}
              color={theme.primaryLight}
            />
            <Text style={styles.rowLabel}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primaryDim }}
            thumbColor={isDark ? theme.primaryLight : theme.textTertiary}
          />
        </View>
      </View>

      {/* ── Data ─────────────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Data</Text>
      <PrimaryButton
        label={exporting ? 'Exporting…' : 'Export Data'}
        variant="secondary"
        onPress={handleExport}
      />

      {/* ── Actions ──────────────────────────────────────────────────────── */}
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

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
        <Ionicons
          name={toast.isError ? 'alert-circle' : 'checkmark-circle'}
          size={15}
          color={toast.isError ? theme.danger : theme.success}
        />
        <Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}
