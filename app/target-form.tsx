import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import {
  categories as categoriesTable,
  habits as habitsTable,
  targets as targetsTable,
} from '@/db/schema';

type Habit    = { id: number; name: string; categoryColor: string; categoryIcon: string; categoryName: string };
type Period   = 'weekly' | 'monthly';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function displayDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TargetForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [habits, setHabits]           = useState<Habit[]>([]);
  const [selectedHabit, setSelected]  = useState<number | null>(null);
  const [period, setPeriod]           = useState<Period>('weekly');
  const [targetCount, setTargetCount] = useState(5);
  const [startDate, setStartDate]     = useState(new Date());
  const [hasEndDate, setHasEndDate]   = useState(false);
  const [endDate, setEndDate]         = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [saving, setSaving] = useState(false);

  // Per-habit bounce anims
  const habitAnims = useRef<Map<number, Animated.Value>>(new Map());
  const getHabitAnim = (hid: number) => {
    if (!habitAnims.current.has(hid)) habitAnims.current.set(hid, new Animated.Value(1));
    return habitAnims.current.get(hid)!;
  };
  const bounceHabit = (hid: number) => {
    const anim = getHabitAnim(hid);
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  useEffect(() => {
    (async () => {
      const rows = await db
        .select({
          id:            habitsTable.id,
          name:          habitsTable.name,
          categoryColor: categoriesTable.color,
          categoryIcon:  categoriesTable.icon,
          categoryName:  categoriesTable.name,
        })
        .from(habitsTable)
        .innerJoin(categoriesTable, eq(habitsTable.categoryId, categoriesTable.id))
        .where(eq(habitsTable.isActive, true));

      setHabits(rows);

      if (isEdit && id) {
        const tRows = await db
          .select()
          .from(targetsTable)
          .where(eq(targetsTable.id, parseInt(id)));
        if (tRows.length > 0) {
          const t = tRows[0];
          setSelected(t.habitId);
          setPeriod(t.period as Period);
          setTargetCount(t.targetCount);
          setStartDate(new Date(t.startDate));
          if (t.endDate) {
            setHasEndDate(true);
            setEndDate(new Date(t.endDate));
          }
        }
      } else if (rows.length > 0) {
        setSelected(rows[0].id);
      }
    })();
  }, []);

  const adjustDate = (which: 'start' | 'end', delta: number) => {
    if (which === 'start') {
      const next = new Date(startDate);
      next.setDate(startDate.getDate() + delta);
      setStartDate(next);
    } else {
      const next = new Date(endDate);
      next.setDate(endDate.getDate() + delta);
      if (next <= startDate) return;
      setEndDate(next);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!selectedHabit) {
      Alert.alert('Missing Habit', 'Please select a habit for this target.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        habitId:     selectedHabit,
        period,
        targetCount,
        startDate:   startDate.toISOString(),
        endDate:     hasEndDate ? endDate.toISOString() : null,
      };

      if (isEdit && id) {
        await db.update(targetsTable).set(payload).where(eq(targetsTable.id, parseInt(id)));
      } else {
        await db.insert(targetsTable).values(payload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.navigate({
        pathname: '/(tabs)/targets',
        params: {
          action: isEdit ? 'updated' : 'created',
          _t:     String(Date.now()),
        },
      });
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedHabitObj = habits.find(h => h.id === selectedHabit);

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
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Target' : 'New Target'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Live preview badge */}
        {selectedHabitObj && (
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewBadge,
                {
                  backgroundColor: selectedHabitObj.categoryColor + '18',
                  borderColor:     selectedHabitObj.categoryColor + '44',
                },
              ]}
            >
              <Ionicons
                name={`${selectedHabitObj.categoryIcon}-outline` as IoniconsName}
                size={18}
                color={selectedHabitObj.categoryColor}
              />
              <Text style={[styles.previewHabit, { color: selectedHabitObj.categoryColor }]}>
                {selectedHabitObj.name}
              </Text>
              <View style={[styles.previewPeriodPill, { borderColor: selectedHabitObj.categoryColor + '55' }]}>
                <Text style={[styles.previewPeriodText, { color: selectedHabitObj.categoryColor }]}>
                  {period === 'weekly' ? 'Weekly' : 'Monthly'}
                </Text>
              </View>
              <Text style={[styles.previewCount, { color: selectedHabitObj.categoryColor }]}>
                ×{targetCount}
              </Text>
            </View>
          </View>
        )}

        {/* Habit picker */}
        <Text style={styles.label}>Habit</Text>
        {habits.length === 0 ? (
          <Text style={styles.noHabits}>
            No habits yet — create one in the Habits tab first.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipScrollContent}
          >
            {habits.map(h => {
              const selected = h.id === selectedHabit;
              return (
                <Animated.View
                  key={h.id}
                  style={{ transform: [{ scale: getHabitAnim(h.id) }] }}
                >
                  <Pressable
                    style={[
                      styles.chip,
                      selected && {
                        backgroundColor: h.categoryColor + '22',
                        borderColor:     h.categoryColor,
                      },
                    ]}
                    onPress={() => {
                      setSelected(h.id);
                      bounceHabit(h.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={`${h.categoryIcon}-outline` as IoniconsName}
                      size={14}
                      color={selected ? h.categoryColor : '#6B7280'}
                    />
                    <Text style={[styles.chipText, selected && { color: h.categoryColor }]}>
                      {h.name}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        {/* Period */}
        <Text style={styles.label}>Period</Text>
        <View style={styles.periodRow}>
          {(['weekly', 'monthly'] as Period[]).map(p => (
            <Pressable
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => {
                setPeriod(p);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={p === 'weekly' ? 'calendar-outline' : 'calendar-number-outline'}
                size={16}
                color={period === p ? '#0F766E' : '#6B7280'}
              />
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Target count */}
        <Text style={styles.label}>Target Count</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={[styles.stepperBtn, targetCount <= 1 && styles.stepperBtnDisabled]}
            onPress={() => {
              if (targetCount > 1) {
                setTargetCount(t => t - 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            disabled={targetCount <= 1}
          >
            <Ionicons name="remove" size={22} color={targetCount <= 1 ? '#374151' : '#F1F5F9'} />
          </Pressable>

          <View style={styles.stepperValueWrap}>
            <Text style={styles.stepperValue}>{targetCount}</Text>
            <Text style={styles.stepperUnit}>
              {targetCount === 1 ? 'time' : 'times'}{' '}
              <Text style={styles.stepperPeriod}>
                / {period === 'weekly' ? 'week' : 'month'}
              </Text>
            </Text>
          </View>

          <Pressable
            style={[styles.stepperBtn, targetCount >= 999 && styles.stepperBtnDisabled]}
            onPress={() => {
              if (targetCount < 999) {
                setTargetCount(t => t + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            disabled={targetCount >= 999}
          >
            <Ionicons name="add" size={22} color={targetCount >= 999 ? '#374151' : '#F1F5F9'} />
          </Pressable>
        </View>

        {/* Start date */}
        <Text style={styles.label}>Start Date</Text>
        <View style={styles.dateRow}>
          <Pressable style={styles.dateArrow} onPress={() => adjustDate('start', -1)}>
            <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
          </Pressable>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{displayDate(startDate)}</Text>
            <Text style={styles.dateSubtext}>{toDateString(startDate)}</Text>
          </View>
          <Pressable style={styles.dateArrow} onPress={() => adjustDate('start', 1)}>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* End date */}
        <View style={styles.endDateHeader}>
          <Text style={styles.label}>End Date</Text>
          <Pressable
            style={[styles.togglePill, hasEndDate && styles.togglePillActive]}
            onPress={() => {
              setHasEndDate(v => !v);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.togglePillText, hasEndDate && styles.togglePillTextActive]}>
              {hasEndDate ? 'Set' : 'None'}
            </Text>
          </Pressable>
        </View>

        {hasEndDate && (
          <View style={styles.dateRow}>
            <Pressable style={styles.dateArrow} onPress={() => adjustDate('end', -1)}>
              <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
            </Pressable>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{displayDate(endDate)}</Text>
              <Text style={styles.dateSubtext}>{toDateString(endDate)}</Text>
            </View>
            <Pressable style={styles.dateArrow} onPress={() => adjustDate('end', 1)}>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        )}

        {/* Save */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            saving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Target'}
          </Text>
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
    paddingBottom: 48,
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
  // Preview
  previewRow: {
    alignItems: 'center',
    marginBottom: 28,
  },
  previewBadge: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewHabit: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewPeriodPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  previewPeriodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewCount: {
    fontSize: 14,
    fontWeight: '800',
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
  noHabits: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 22,
  },
  // Chips
  chipScroll: {
    marginBottom: 24,
  },
  chipScrollContent: {
    paddingRight: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  // Period
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  periodBtn: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  periodBtnActive: {
    backgroundColor: '#0F766E22',
    borderColor: '#0F766E',
  },
  periodBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  periodBtnTextActive: {
    color: '#0F766E',
  },
  // Stepper
  stepperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    marginBottom: 28,
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValueWrap: {
    alignItems: 'center',
    minWidth: 90,
  },
  stepperValue: {
    color: '#F1F5F9',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  stepperUnit: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  stepperPeriod: {
    color: '#4B5563',
    fontWeight: '400',
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
    marginBottom: 24,
    paddingVertical: 4,
  },
  dateArrow: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  dateDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    color: '#F1F5F9',
    fontSize: 17,
    fontWeight: '700',
  },
  dateSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  // End date toggle
  endDateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  togglePill: {
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  togglePillActive: {
    backgroundColor: '#0F766E22',
    borderColor: '#0F766E',
  },
  togglePillText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  togglePillTextActive: {
    color: '#0F766E',
  },
  // Save
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 14,
    marginTop: 8,
    paddingVertical: 15,
  },
  saveBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
