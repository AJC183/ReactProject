import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { eq, like, sum } from 'drizzle-orm';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import SettingsPanel from '@/components/ui/settings-panel';
import { db } from '@/db/client';
import { categories as categoriesTable, habits as habitsTable, habitLogs } from '@/db/schema';

type HabitRow = {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  targetCount: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  loggedToday: number;
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({
  current,
  target,
  color,
  size = 56,
}: {
  current: number;
  target: number;
  color: string;
  size?: number;
}) {
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const bw   = Math.max(4, Math.round(size * 0.1));
  const half = size / 2;

  const rightRotate = progress <= 0.5 ? 180 - progress * 2 * 180 : 0;
  const leftRotate  = progress <= 0.5 ? -180 : -180 + (progress - 0.5) * 2 * 180;

  return (
    <View style={{ width: size, height: size }}>
      {/* Track */}
      <View
        style={{
          position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
          borderRadius: half, borderWidth: bw, borderColor: '#2A2A38',
        }}
      />

      {/* Right fill */}
      <View
        style={{
          position: 'absolute', left: half, top: 0,
          width: half, height: size, overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute', left: -half, top: 0,
            width: size, height: size,
            borderRadius: half, borderWidth: bw, borderColor: color,
            transform: [{ rotate: `${rightRotate}deg` }],
          }}
        />
      </View>

      {/* Left fill */}
      <View
        style={{
          position: 'absolute', left: 0, top: 0,
          width: half, height: size, overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute', left: 0, top: 0,
            width: size, height: size,
            borderRadius: half, borderWidth: bw, borderColor: color,
            transform: [{ rotate: `${leftRotate}deg` }],
          }}
        />
      </View>

      {/* Centre label */}
      <View
        style={{
          position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Text
          style={{ color: '#FFFFFF', fontSize: size * 0.24, fontWeight: '800', lineHeight: size * 0.3 }}
        >
          {current}
        </Text>
        <Text style={{ color: '#6B7280', fontSize: size * 0.2, fontWeight: '500' }}>
          /{target}
        </Text>
      </View>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0,    useNativeDriver: true, tension: 90, friction: 9 }),
        Animated.spring(scale,      { toValue: 1,    useNativeDriver: true, tension: 90, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 20,   duration: 180, useNativeDriver: true }),
        Animated.timing(scale,      { toValue: 0.85, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,    duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HabitsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string; habitName?: string; _t?: string }>();

  const [habits, setHabits]         = useState<HabitRow[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast]           = useState({ message: '', visible: false });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const entryAnims = useRef<Map<number, Animated.Value>>(new Map());
  const deleteAnim = useRef(new Animated.Value(1)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTs     = useRef('');

  const getEntryAnim = (id: number) => {
    if (!entryAnims.current.has(id)) {
      entryAnims.current.set(id, new Animated.Value(0));
    }
    return entryAnims.current.get(id)!;
  };

  const runEntryAnimations = (list: HabitRow[]) => {
    list.forEach((h, i) => {
      const anim = getEntryAnim(h.id);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        delay: i * 55,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();
    });
  };

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      2200,
    );
  };

  const loadHabits = useCallback(async () => {
    const now   = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const rows = await db
      .select({
        id:            habitsTable.id,
        name:          habitsTable.name,
        description:   habitsTable.description,
        frequency:     habitsTable.frequency,
        targetCount:   habitsTable.targetCount,
        categoryId:    habitsTable.categoryId,
        categoryName:  categoriesTable.name,
        categoryColor: categoriesTable.color,
        categoryIcon:  categoriesTable.icon,
      })
      .from(habitsTable)
      .innerJoin(categoriesTable, eq(habitsTable.categoryId, categoriesTable.id))
      .where(eq(habitsTable.isActive, true));

    const logCounts = await db
      .select({ habitId: habitLogs.habitId, total: sum(habitLogs.value) })
      .from(habitLogs)
      .where(like(habitLogs.loggedAt, `${today}%`))
      .groupBy(habitLogs.habitId);

    const countMap = new Map(logCounts.map(r => [r.habitId, parseFloat(r.total ?? '0') || 0]));

    const merged: HabitRow[] = rows.map(r => ({
      ...r,
      description:  r.description ?? null,
      loggedToday:  countMap.get(r.id) ?? 0,
    }));

    setHabits(merged);
    runEntryAnimations(merged);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
      if (params._t && params._t !== lastTs.current && params.action) {
        lastTs.current = params._t;
        const msg =
          params.action === 'created' ? `"${params.habitName}" created` :
          params.action === 'updated' ? `"${params.habitName}" updated` :
          params.action === 'logged'  ? `Activity logged!` : '';
        if (msg) {
          setTimeout(() => {
            showToast(msg);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 150);
        }
      }
    }, [params._t]),
  );

  const handleDelete = (habit: HabitRow) => {
    Alert.alert(
      'Delete Habit',
      `Delete "${habit.name}"? All logs for this habit will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(habit) },
      ],
    );
  };

  const performDelete = (habit: HabitRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeletingId(habit.id);
    deleteAnim.setValue(1);

    Animated.timing(deleteAnim, {
      toValue: 0, duration: 220, useNativeDriver: true,
    }).start(async ({ finished }) => {
      if (!finished) return;
      try {
        await db.delete(habitLogs).where(eq(habitLogs.habitId, habit.id));
        await db.delete(habitsTable).where(eq(habitsTable.id, habit.id));
        setHabits(prev => prev.filter(h => h.id !== habit.id));
        showToast(`"${habit.name}" deleted`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('Error', 'Could not delete habit. Please try again.');
      } finally {
        setDeletingId(null);
        deleteAnim.setValue(1);
      }
    });
  };

  const completedToday = habits.filter(h => h.loggedToday >= h.targetCount).length;
  const progressPct    = habits.length > 0 ? completedToday / habits.length : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Habits</Text>
          <Text style={styles.headerSub}>
            {habits.length === 0
              ? 'No habits yet'
              : completedToday === habits.length
              ? 'All done — great work!'
              : `${completedToday} of ${habits.length} done today`}
          </Text>
        </View>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Ionicons name="settings-outline" size={21} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Progress strip */}
      {habits.length > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          habits.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={54} color="#252532" />
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to create your first habit and start tracking your progress.
            </Text>
          </View>
        ) : (
          habits.map(habit => {
            const entryAnim  = getEntryAnim(habit.id);
            const isDeleting = deletingId === habit.id;
            const done       = habit.loggedToday >= habit.targetCount;

            return (
              <Animated.View
                key={habit.id}
                style={[
                  styles.card,
                  done && styles.cardDone,
                  {
                    opacity: isDeleting ? deleteAnim : entryAnim,
                    transform: isDeleting
                      ? [{ scale: deleteAnim }]
                      : [
                          {
                            translateY: entryAnim.interpolate({
                              inputRange:  [0, 1],
                              outputRange: [28, 0],
                            }),
                          },
                        ],
                  },
                ]}
              >
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: habit.categoryColor }]} />

                <View style={styles.cardInner}>
                  {/* Top row */}
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: habit.categoryColor + '22' },
                      ]}
                    >
                      <Ionicons
                        name={`${habit.categoryIcon}-outline` as IoniconsName}
                        size={20}
                        color={habit.categoryColor}
                      />
                    </View>

                    <View style={styles.habitInfo}>
                      <Text style={styles.habitName} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[styles.metaCat, { color: habit.categoryColor }]}>
                          {habit.categoryName}
                        </Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.metaFreq}>
                          {habit.frequency === 'daily' ? 'Daily' : 'Weekly'}
                        </Text>
                      </View>
                    </View>

                    <ProgressRing
                      current={habit.loggedToday}
                      target={habit.targetCount}
                      color={done ? '#22C55E' : habit.categoryColor}
                      size={54}
                    />
                  </View>

                  {/* Bottom row */}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.logBtn,
                        {
                          backgroundColor: done ? '#22C55E18' : habit.categoryColor + '18',
                          borderColor:     done ? '#22C55E'   : habit.categoryColor,
                        },
                        pressed && styles.logBtnPressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/log-form',
                          params: {
                            habitId:       String(habit.id),
                            habitName:     habit.name,
                            categoryColor: habit.categoryColor,
                          },
                        })
                      }
                    >
                      <Ionicons
                        name={done ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={done ? '#22C55E' : habit.categoryColor}
                      />
                      <Text
                        style={[
                          styles.logBtnText,
                          { color: done ? '#22C55E' : habit.categoryColor },
                        ]}
                      >
                        {done ? 'Logged' : 'Log'}
                      </Text>
                    </Pressable>

                    <View style={styles.iconActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.iconAction,
                          pressed && styles.iconActionPressed,
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/habit-form',
                            params: { id: String(habit.id) },
                          })
                        }
                        hitSlop={6}
                      >
                        <Ionicons name="create-outline" size={18} color="#6B7280" />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.iconAction,
                          pressed && styles.iconActionPressed,
                        ]}
                        onPress={() => handleDelete(habit)}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/habit-form')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <Toast message={toast.message} visible={toast.visible} />

      <SettingsPanel visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0D0D12',
    flex: 1,
  },
  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 3,
  },
  headerBtn: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  // Progress strip
  progressTrack: {
    backgroundColor: '#252532',
    borderRadius: 2,
    height: 3,
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#22C55E',
    borderRadius: 2,
    height: 3,
  },
  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listEmpty: {
    flex: 1,
  },
  // Card
  card: {
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardDone: {
    borderColor: '#22C55E33',
  },
  accentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  metaCat: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    color: '#374151',
    fontSize: 12,
  },
  metaFreq: {
    color: '#6B7280',
    fontSize: 12,
  },
  // Card actions
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logBtn: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  logBtnPressed: {
    opacity: 0.7,
  },
  logBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconAction: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconActionPressed: {
    backgroundColor: '#252532',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  // FAB
  fab: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 28,
    bottom: 24,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    width: 56,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.93 }],
  },
  // Toast
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 100,
    borderWidth: 1,
    bottom: 90,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    position: 'absolute',
  },
  toastText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
});
