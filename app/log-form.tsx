import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { habitLogs } from '@/db/schema';

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayDate(date: Date): string {
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (toDateString(date) === toDateString(today))     return 'Today';
  if (toDateString(date) === toDateString(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function LogForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    habitId:       string;
    habitName?:    string;
    categoryColor?: string;
  }>();

  const [date, setDate]   = useState(new Date());
  const [value, setValue] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const accentColor = params.categoryColor ?? '#0F766E';
  const isToday     = toDateString(date) === toDateString(new Date());

  const adjustDate = (delta: number) => {
    const next = new Date(date);
    next.setDate(date.getDate() + delta);
    if (next > new Date()) return;
    setDate(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustValue = (delta: number) => {
    const next = value + delta;
    if (next < 1 || next > 999) return;
    setValue(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!params.habitId) return;
    setSaving(true);
    try {
      await db.insert(habitLogs).values({
        habitId:  parseInt(params.habitId),
        loggedAt: `${toDateString(date)}T00:00:00.000Z`,
        value,
        note:     notes.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.navigate({
        pathname: '/(tabs)',
        params: {
          action:    'logged',
          habitName: params.habitName ?? '',
          _t:        String(Date.now()),
        },
      });
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
          </Pressable>
          <Text style={styles.headerTitle}>Log Activity</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Habit name badge */}
        {params.habitName ? (
          <View
            style={[
              styles.habitBadge,
              { backgroundColor: accentColor + '14', borderColor: accentColor + '44' },
            ]}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={accentColor} />
            <Text style={[styles.habitBadgeText, { color: accentColor }]}>
              {params.habitName}
            </Text>
          </View>
        ) : null}

        {/* Date picker */}
        <Text style={styles.label}>Date</Text>
        <View style={styles.dateRow}>
          <Pressable style={styles.dateArrow} onPress={() => adjustDate(-1)}>
            <Ionicons name="chevron-back" size={22} color="#9CA3AF" />
          </Pressable>

          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{displayDate(date)}</Text>
            <Text style={styles.dateSubtext}>{toDateString(date)}</Text>
          </View>

          <Pressable
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
            onPress={() => adjustDate(1)}
            disabled={isToday}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isToday ? '#374151' : '#9CA3AF'}
            />
          </Pressable>
        </View>

        {/* Value stepper */}
        <Text style={styles.label}>Count / Value</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={[styles.stepperBtn, value <= 1 && styles.stepperBtnDisabled]}
            onPress={() => adjustValue(-1)}
            disabled={value <= 1}
          >
            <Ionicons name="remove" size={22} color={value <= 1 ? '#374151' : '#F1F5F9'} />
          </Pressable>

          <View style={styles.stepperValueWrap}>
            <Text style={[styles.stepperValue, { color: accentColor }]}>{value}</Text>
            <Text style={styles.stepperUnit}>{value === 1 ? 'time' : 'times'}</Text>
          </View>

          <Pressable
            style={[styles.stepperBtn, value >= 999 && styles.stepperBtnDisabled]}
            onPress={() => adjustValue(1)}
            disabled={value >= 999}
          >
            <Ionicons name="add" size={22} color={value >= 999 ? '#374151' : '#F1F5F9'} />
          </Pressable>
        </View>

        {/* Notes */}
        <Text style={styles.label}>
          Notes <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes for this log…"
          placeholderTextColor="#4B5563"
          multiline
          numberOfLines={4}
          maxLength={300}
        />

        {/* Save */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: accentColor },
            pressed && styles.saveBtnPressed,
            saving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Log'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0D0D12',
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 24,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
  },
  // Habit badge
  habitBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  habitBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Labels
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optional: {
    color: '#4B5563',
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
  },
  // Date row
  dateRow: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingVertical: 4,
  },
  dateArrow: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
  },
  dateSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  // Stepper
  stepperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValueWrap: {
    alignItems: 'center',
    minWidth: 80,
  },
  stepperValue: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 50,
  },
  stepperUnit: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  // Input
  input: {
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F1F5F9',
    fontSize: 15,
    marginBottom: 32,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  // Save
  saveBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  saveBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
