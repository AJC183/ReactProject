import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { and, eq, gte, lte, sum } from 'drizzle-orm';
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

import { db } from '@/db/client';
import {
  categories as categoriesTable,
  habits as habitsTable,
  habitLogs,
  targets as targetsTable,
} from '@/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'met' | 'active' | 'overdue';

type TargetRow = {
  id: number;
  habitId: number;
  habitName: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  period: string;
  targetCount: number;
  startDate: string;
  endDate: string | null;
  progress: number;
  status: Status;
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  met:     '#22C55E',
  active:  '#F59E0B',
  overdue: '#EF4444',
} as const;

const STATUS_LABEL = {
  met:     'Goal Met',
  active:  'In Progress',
  overdue: 'Overdue',
} as const;

const STATUS_ICON: Record<Status, IoniconsName> = {
  met:     'checkmark-circle',
  active:  'time-outline',
  overdue: 'alert-circle-outline',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon.toISOString(), end: sun.toISOString() };
}

function getMonthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getStatus(progress: number, target: number, endDate: string | null): Status {
  if (progress >= target) return 'met';
  if (endDate && new Date(endDate) < new Date()) return 'overdue';
  return 'active';
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({
  current,
  target,
  color,
  size = 56,
  showPct = false,
}: {
  current: number;
  target: number;
  color: string;
  size?: number;
  showPct?: boolean;
}) {
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const bw   = Math.max(4, Math.round(size * 0.09));
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
      <View style={{ position: 'absolute', left: half, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: -half, top: 0, width: size, height: size,
          borderRadius: half, borderWidth: bw, borderColor: color,
          transform: [{ rotate: `${rightRotate}deg` }],
        }} />
      </View>
      {/* Left fill */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          position: 'absolute', left: 0, top: 0, width: size, height: size,
          borderRadius: half, borderWidth: bw, borderColor: color,
          transform: [{ rotate: `${leftRotate}deg` }],
        }} />
      </View>
      {/* Centre */}
      <View style={{
        position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {showPct ? (
          <Text style={{ color: '#FFFFFF', fontSize: size * 0.21, fontWeight: '800' }}>
            {Math.round(progress * 100)}%
          </Text>
        ) : (
          <>
            <Text style={{ color: '#FFFFFF', fontSize: size * 0.24, fontWeight: '800', lineHeight: size * 0.3 }}>
              {Math.min(Math.round(current), target)}
            </Text>
            <Text style={{ color: '#6B7280', fontSize: size * 0.19, fontWeight: '500' }}>
              /{target}
            </Text>
          </>
        )}
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

export default function TargetsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string; _t?: string }>();

  const [targets, setTargets]       = useState<TargetRow[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast]           = useState({ message: '', visible: false });

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

  const runEntryAnimations = (list: TargetRow[]) => {
    list.forEach((t, i) => {
      const anim = getEntryAnim(t.id);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1, delay: i * 55, useNativeDriver: true, tension: 70, friction: 11,
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

  const loadTargets = useCallback(async () => {
    const weekRange  = getWeekRange();
    const monthRange = getMonthRange();

    const rows = await db
      .select({
        id:            targetsTable.id,
        habitId:       targetsTable.habitId,
        period:        targetsTable.period,
        targetCount:   targetsTable.targetCount,
        startDate:     targetsTable.startDate,
        endDate:       targetsTable.endDate,
        habitName:     habitsTable.name,
        categoryName:  categoriesTable.name,
        categoryColor: categoriesTable.color,
        categoryIcon:  categoriesTable.icon,
      })
      .from(targetsTable)
      .innerJoin(habitsTable, eq(targetsTable.habitId, habitsTable.id))
      .innerJoin(categoriesTable, eq(habitsTable.categoryId, categoriesTable.id));

    const weekLogs = await db
      .select({ habitId: habitLogs.habitId, total: sum(habitLogs.value) })
      .from(habitLogs)
      .where(and(gte(habitLogs.loggedAt, weekRange.start), lte(habitLogs.loggedAt, weekRange.end)))
      .groupBy(habitLogs.habitId);

    const monthLogs = await db
      .select({ habitId: habitLogs.habitId, total: sum(habitLogs.value) })
      .from(habitLogs)
      .where(and(gte(habitLogs.loggedAt, monthRange.start), lte(habitLogs.loggedAt, monthRange.end)))
      .groupBy(habitLogs.habitId);

    const weekMap  = new Map(weekLogs.map(r => [r.habitId, parseFloat(r.total ?? '0') || 0]));
    const monthMap = new Map(monthLogs.map(r => [r.habitId, parseFloat(r.total ?? '0') || 0]));

    const merged: TargetRow[] = rows.map(r => {
      const progress = r.period === 'weekly'
        ? weekMap.get(r.habitId) ?? 0
        : monthMap.get(r.habitId) ?? 0;
      return {
        ...r,
        endDate:  r.endDate ?? null,
        progress,
        status:   getStatus(progress, r.targetCount, r.endDate ?? null),
      };
    });

    setTargets(merged);
    runEntryAnimations(merged);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTargets();
      if (params._t && params._t !== lastTs.current && params.action) {
        lastTs.current = params._t;
        const msg =
          params.action === 'created' ? 'Target created' :
          params.action === 'updated' ? 'Target updated' : '';
        if (msg) {
          setTimeout(() => {
            showToast(msg);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 150);
        }
      }
    }, [params._t]),
  );

  const handleDelete = (target: TargetRow) => {
    Alert.alert(
      'Delete Target',
      `Remove the ${target.period} target for "${target.habitName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(target) },
      ],
    );
  };

  const performDelete = (target: TargetRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeletingId(target.id);
    deleteAnim.setValue(1);

    Animated.timing(deleteAnim, { toValue: 0, duration: 220, useNativeDriver: true })
      .start(async ({ finished }) => {
        if (!finished) return;
        try {
          await db.delete(targetsTable).where(eq(targetsTable.id, target.id));
          setTargets(prev => prev.filter(t => t.id !== target.id));
          showToast('Target deleted');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          Alert.alert('Error', 'Could not delete target. Please try again.');
        } finally {
          setDeletingId(null);
          deleteAnim.setValue(1);
        }
      });
  };

  // ── Derived stats ────────────────────────────────────────────────────────────

  const weekly     = targets.filter(t => t.period === 'weekly');
  const monthly    = targets.filter(t => t.period === 'monthly');
  const weeklyMet  = weekly.filter(t => t.status === 'met').length;
  const monthlyMet = monthly.filter(t => t.status === 'met').length;
  const totalMet   = targets.filter(t => t.status === 'met').length;

  // ── Card renderer ────────────────────────────────────────────────────────────

  const renderCard = (target: TargetRow) => {
    const entryAnim   = getEntryAnim(target.id);
    const isDeleting  = deletingId === target.id;
    const pct         = target.targetCount > 0 ? Math.min(1, target.progress / target.targetCount) : 0;
    const statusColor = STATUS_COLOR[target.status];
    const remaining   = Math.max(0, target.targetCount - target.progress);

    return (
      <Animated.View
        key={target.id}
        style={[
          styles.card,
          {
            borderColor:
              target.status === 'met'     ? '#22C55E33' :
              target.status === 'overdue' ? '#EF444433' : '#252532',
          },
          {
            opacity: isDeleting ? deleteAnim : entryAnim,
            transform: isDeleting
              ? [{ scale: deleteAnim }]
              : [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: target.categoryColor }]} />

        <View style={styles.cardInner}>
          {/* Top row: ring + info */}
          <View style={styles.cardTop}>
            <ProgressRing
              current={target.progress}
              target={target.targetCount}
              color={statusColor}
              size={60}
            />

            <View style={styles.cardInfo}>
              {/* Name + status pill */}
              <View style={styles.cardTitleRow}>
                <Text style={styles.habitName} numberOfLines={1}>{target.habitName}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusColor + '20', borderColor: statusColor + '55' },
                  ]}
                >
                  <Ionicons name={STATUS_ICON[target.status]} size={10} color={statusColor} />
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {STATUS_LABEL[target.status]}
                  </Text>
                </View>
              </View>

              {/* Meta */}
              <View style={styles.metaRow}>
                <Text style={[styles.metaCat, { color: target.categoryColor }]}>
                  {target.categoryName}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>
                  {target.period === 'weekly' ? 'This week' : 'This month'}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct * 100}%`, backgroundColor: statusColor },
                  ]}
                />
              </View>

              <Text style={styles.progressLabel}>
                {target.status === 'met'
                  ? `${Math.round(target.progress)} logged — goal reached!`
                  : `${Math.round(target.progress)} / ${target.targetCount} — ${remaining} to go`}
              </Text>
            </View>
          </View>

          {/* Bottom row */}
          <View style={styles.cardActions}>
            {target.endDate ? (
              <Text style={styles.endDateText}>
                Ends{' '}
                {new Date(target.endDate).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short',
                })}
              </Text>
            ) : (
              <Text style={styles.endDateText}>Ongoing</Text>
            )}
            <View style={styles.iconActions}>
              <Pressable
                style={({ pressed }) => [styles.iconAction, pressed && styles.iconActionPressed]}
                onPress={() =>
                  router.push({ pathname: '/target-form', params: { id: String(target.id) } })
                }
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={18} color="#6B7280" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconAction, pressed && styles.iconActionPressed]}
                onPress={() => handleDelete(target)}
                hitSlop={6}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Targets</Text>
          <Text style={styles.headerSub}>
            {targets.length === 0
              ? 'No targets yet'
              : `${totalMet} of ${targets.length} goals met`}
          </Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/target-form')}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* WHOOP-style summary panels */}
      {targets.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryPeriodLabel}>WEEKLY</Text>
            <ProgressRing
              current={weeklyMet}
              target={Math.max(1, weekly.length)}
              color={weekly.length > 0 && weeklyMet === weekly.length ? '#22C55E' : '#F59E0B'}
              size={76}
              showPct
            />
            <Text style={styles.summarySubLabel}>
              {weeklyMet}/{weekly.length} goals
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryPeriodLabel}>MONTHLY</Text>
            <ProgressRing
              current={monthlyMet}
              target={Math.max(1, monthly.length)}
              color={monthly.length > 0 && monthlyMet === monthly.length ? '#22C55E' : '#818CF8'}
              size={76}
              showPct
            />
            <Text style={styles.summarySubLabel}>
              {monthlyMet}/{monthly.length} goals
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          targets.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {targets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={54} color="#252532" />
            <Text style={styles.emptyTitle}>No targets yet</Text>
            <Text style={styles.emptySubtitle}>
              Set weekly or monthly goals for your habits and track your progress here.
            </Text>
          </View>
        ) : (
          <>
            {weekly.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>WEEKLY GOALS</Text>
                {weekly.map(t => renderCard(t))}
              </>
            )}
            {monthly.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, weekly.length > 0 && { marginTop: 8 }]}>
                  MONTHLY GOALS
                </Text>
                {monthly.map(t => renderCard(t))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Toast message={toast.message} visible={toast.visible} />
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
  addBtn: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  // Summary panels (WHOOP-style)
  summaryRow: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 20,
  },
  summaryCard: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  summaryDivider: {
    backgroundColor: '#252532',
    height: 64,
    width: 1,
  },
  summaryPeriodLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  summarySubLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  // List
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listEmpty: { flex: 1 },
  // Section label
  sectionLabel: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },
  // Card
  card: {
    backgroundColor: '#181821',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  accentBar: { width: 4 },
  cardInner: {
    flex: 1,
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  cardInfo: { flex: 1 },
  cardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  habitName: {
    color: '#F1F5F9',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  metaCat: { fontSize: 12, fontWeight: '600' },
  metaDot: { color: '#374151', fontSize: 12 },
  metaText: { color: '#6B7280', fontSize: 12 },
  // Progress bar
  progressTrack: {
    backgroundColor: '#252532',
    borderRadius: 3,
    height: 5,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 3,
    height: 5,
  },
  progressLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
  // Card actions
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endDateText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '500',
  },
  iconActions: { flexDirection: 'row', gap: 4 },
  iconAction: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconActionPressed: { backgroundColor: '#252532' },
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
  // Toast
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 100,
    borderWidth: 1,
    bottom: 24,
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
