import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { and, eq, gte, lte } from 'drizzle-orm';
import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { categories as categoriesTable, habits as habitsTable, habitLogs } from '@/db/schema';
import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7D' | '30D' | '90D';

type HabitStat = {
  id: number;
  name: string;
  categoryColor: string;
  total: number;
  targetCount: number;
};

type CategorStat = {
  name: string;
  color: string;
  total: number;
};

type DayStat = {
  ymd: string;
  total: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;

function periodDays(p: Period) {
  return p === '7D' ? 7 : p === '30D' ? 30 : 90;
}

function dateRangeISO(days: number) {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function toYMD(iso: string) {
  return iso.slice(0, 10);
}

function allDaysInRange(days: number): string[] {
  const result: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    result.push(toYMD(d.toISOString()));
  }
  return result;
}

// ─── Styles factory ───────────────────────────────────────────────────────────

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.background,
      flex: 1,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 48,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    headerTitle: {
      color: theme.textPrimary,
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1,
    },
    headerSub: {
      color: theme.textSecondary,
      fontSize: Typography.captionSize,
      marginTop: 3,
    },
    headerIcon: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      height: 38,
      justifyContent: 'center',
      width: 38,
    },
    pillRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    pill: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
    },
    pillActive: {
      backgroundColor: theme.primaryDim,
      borderColor: theme.primaryLight,
    },
    pillText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    pillTextActive: {
      color: theme.primaryLight,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    summaryCard: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      flex: 1,
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 14,
    },
    summaryIcon: {
      alignItems: 'center',
      borderRadius: Radius.sm,
      height: 28,
      justifyContent: 'center',
      marginBottom: 2,
      width: 28,
    },
    summaryVal: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
    },
    summaryLbl: {
      color: theme.textTertiary,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    chartCard: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.xl,
      borderWidth: 1,
      marginBottom: Spacing.lg,
      padding: Spacing.md,
    },
    chartTitle: {
      color: theme.textPrimary,
      fontSize: Typography.headingSize,
      fontWeight: '700',
      marginBottom: 2,
    },
    chartSub: {
      color: theme.textTertiary,
      fontSize: Typography.captionSize,
      marginBottom: Spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      marginTop: 80,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginTop: 16,
    },
    emptySubtitle: {
      color: theme.textSecondary,
      fontSize: Typography.bodySize,
      lineHeight: 22,
      marginTop: 6,
      textAlign: 'center',
    },
  });
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChartCustom({ data, theme }: { data: HabitStat[]; theme: AppTheme }) {
  if (data.length === 0) return null;
  const maxVal   = Math.max(...data.map(d => d.total), 1);
  const maxH     = 140;
  const barWidth = Math.min(36, Math.floor((SCREEN_WIDTH - Spacing.lg * 4) / data.length) - 6);

  return (
    <View style={{ height: 200, justifyContent: 'flex-end', width: '100%', position: 'relative' }}>
      {[1, 0.5, 0].map(frac => (
        <View
          key={frac}
          style={{
            backgroundColor: theme.border,
            height: 1,
            left: 0,
            opacity: 0.5,
            position: 'absolute',
            right: 0,
            bottom: frac * maxH + 28,
          }}
        />
      ))}
      <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 6, justifyContent: 'center', paddingBottom: 28 }}>
        {data.map((item, i) => {
          const h = Math.max(4, Math.round((item.total / maxVal) * maxH));
          return (
            <View key={i} style={{ alignItems: 'center', gap: 4, width: barWidth }}>
              <Text style={{ color: theme.textSecondary, fontSize: 9, fontWeight: '600' }}>{item.total}</Text>
              <View style={{
                height: h,
                backgroundColor: item.categoryColor,
                width: barWidth,
                borderRadius: 6,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 3,
                shadowColor: item.categoryColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
                elevation: 4,
              }} />
              <Text style={{ color: theme.textTertiary, fontSize: 9, textAlign: 'center', width: '100%' }} numberOfLines={1}>
                {item.name.length > 6 ? item.name.slice(0, 5) + '…' : item.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Donut Ring ───────────────────────────────────────────────────────────────

function DonutRing({ data, total, theme }: { data: CategorStat[]; total: number; theme: AppTheme }) {
  const size = 160;
  const half = size / 2;
  const bw   = 18;

  const sorted    = [...data].sort((a, b) => b.total - a.total);
  const ringGap   = 14;
  const baseRadius = half - bw / 2;

  return (
    <View style={{ alignItems: 'center', gap: Spacing.lg, width: '100%' }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        {sorted.map((cat, i) => {
          const progress = total > 0 ? Math.min(1, cat.total / total) : 0;
          const r        = baseRadius - i * (bw + ringGap * 0.4);
          const s        = r * 2 + bw;
          const offset   = half - r - bw / 2;

          if (r <= 0) return null;

          const rightRot = progress <= 0.5 ? 180 - progress * 2 * 180 : 0;
          const leftRot  = progress <= 0.5 ? -180 : -180 + (progress - 0.5) * 2 * 180;

          return (
            <View key={i} style={{ position: 'absolute', left: offset, top: offset, width: s, height: s }}>
              <View style={{
                position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                borderRadius: r + bw / 2, borderWidth: bw, borderColor: cat.color + '22',
              }} />
              <View style={{ position: 'absolute', left: s / 2, top: 0, width: s / 2, height: s, overflow: 'hidden' }}>
                <View style={{
                  position: 'absolute', left: -s / 2, top: 0, width: s, height: s,
                  borderRadius: r + bw / 2, borderWidth: bw, borderColor: cat.color,
                  transform: [{ rotate: `${rightRot}deg` }],
                }} />
              </View>
              <View style={{ position: 'absolute', left: 0, top: 0, width: s / 2, height: s, overflow: 'hidden' }}>
                <View style={{
                  position: 'absolute', left: 0, top: 0, width: s, height: s,
                  borderRadius: r + bw / 2, borderWidth: bw, borderColor: cat.color,
                  transform: [{ rotate: `${leftRot}deg` }],
                }} />
              </View>
            </View>
          );
        })}
        <View style={{
          position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: theme.textPrimary, fontSize: 26, fontWeight: '800' }}>{total}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 11 }}>logs</Text>
        </View>
      </View>

      <View style={{ gap: 8, width: '100%' }}>
        {sorted.map((cat, i) => (
          <View key={i} style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
            <View style={{ backgroundColor: cat.color, borderRadius: 3, height: 10, width: 10 }} />
            <Text style={{ color: theme.textSecondary, flex: 1, fontSize: 13 }}>{cat.name}</Text>
            <Text style={{ color: cat.color, fontSize: 13, fontWeight: '700' }}>{cat.total}</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 11, width: 36, textAlign: 'right' }}>
              {total > 0 ? Math.round((cat.total / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function ActivityHeatmap({
  days,
  dayStats,
  theme,
}: {
  days: number;
  dayStats: DayStat[];
  theme: AppTheme;
}) {
  const statMap  = new Map(dayStats.map(d => [d.ymd, d.total]));
  const allDays  = allDaysInRange(days);
  const maxVal   = Math.max(...dayStats.map(d => d.total), 1);
  const cellSize = days <= 7 ? 36 : days <= 30 ? 22 : 12;
  const cellGap  = days <= 7 ? 6 : days <= 30 ? 4 : 2;
  const cols     = 7;

  const firstDate = new Date(allDays[0]);
  const firstDow  = (firstDate.getDay() + 6) % 7;
  const padded    = [...Array(firstDow).fill(null), ...allDays];
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', gap: cellGap, marginBottom: cellGap, paddingLeft: 2 }}>
        {dayLabels.map((d, i) => (
          <View key={i} style={{ width: cellSize, alignItems: 'center' }}>
            <Text style={{ color: theme.textTertiary, fontSize: 9 }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'column', gap: cellGap }}>
        {Array.from({ length: Math.ceil(padded.length / cols) }).map((_, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: cellGap }}>
            {Array.from({ length: cols }).map((_, colIdx) => {
              const ymd   = padded[rowIdx * cols + colIdx];
              const val   = ymd ? (statMap.get(ymd) ?? 0) : 0;
              const alpha = ymd && val > 0 ? 0.15 + (val / maxVal) * 0.85 : 0;
              const isToday = ymd === toYMD(new Date().toISOString());
              return (
                <View
                  key={colIdx}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: days <= 7 ? 8 : days <= 30 ? 5 : 3,
                    backgroundColor: ymd
                      ? val > 0
                        ? theme.primary + Math.round(alpha * 255).toString(16).padStart(2, '0')
                        : theme.surface
                      : 'transparent',
                    borderWidth: isToday ? 1 : 0,
                    borderColor: theme.primaryLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {days <= 7 && ymd ? (
                    <Text style={{ color: val > 0 ? theme.textPrimary : theme.textTertiary, fontSize: 11, fontWeight: '700' }}>
                      {val > 0 ? val : ''}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 10 }}>
        <Text style={{ color: theme.textTertiary, fontSize: 9 }}>Less</Text>
        {[0.1, 0.3, 0.55, 0.8, 1].map((a, i) => (
          <View key={i} style={{
            backgroundColor: theme.primary + Math.round(a * 255).toString(16).padStart(2, '0'),
            borderRadius: 2,
            height: 10,
            width: 10,
          }} />
        ))}
        <Text style={{ color: theme.textTertiary, fontSize: 9 }}>More</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const { theme }              = useAppTheme();
  const styles                 = useMemo(() => makeStyles(theme), [theme]);

  const [period, setPeriod]         = useState<Period>('30D');
  const [habitStats, setHabitStats] = useState<HabitStat[]>([]);
  const [catStats, setCatStats]     = useState<CategorStat[]>([]);
  const [dayStats, setDayStats]     = useState<DayStat[]>([]);
  const [totalLogs, setTotalLogs]   = useState(0);
  const [completion, setCompletion] = useState(0);
  const [topHabit, setTopHabit]     = useState('—');
  const [hasData, setHasData]       = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const days           = periodDays(period);
      const { start, end } = dateRangeISO(days);

      const logs = await db
        .select({ habitId: habitLogs.habitId, loggedAt: habitLogs.loggedAt, value: habitLogs.value })
        .from(habitLogs)
        .where(and(gte(habitLogs.loggedAt, start), lte(habitLogs.loggedAt, end)));

      if (logs.length === 0) {
        setHasData(false);
        setHabitStats([]); setCatStats([]); setDayStats([]);
        setTotalLogs(0); setCompletion(0); setTopHabit('—');
        setLoading(false);
        return;
      }
      setHasData(true);

      const habitRows = await db
        .select({
          id: habitsTable.id, name: habitsTable.name,
          targetCount: habitsTable.targetCount, frequency: habitsTable.frequency,
          categoryId: habitsTable.categoryId,
          categoryName: categoriesTable.name, categoryColor: categoriesTable.color,
        })
        .from(habitsTable)
        .innerJoin(categoriesTable, eq(habitsTable.categoryId, categoriesTable.id))
        .where(eq(habitsTable.isActive, true));

      const habitLogMap = new Map<number, number>();
      for (const log of logs) {
        habitLogMap.set(log.habitId, (habitLogMap.get(log.habitId) ?? 0) + log.value);
      }

      const hStats: HabitStat[] = habitRows
        .map(h => ({ id: h.id, name: h.name, categoryColor: h.categoryColor, total: Math.round(habitLogMap.get(h.id) ?? 0), targetCount: h.targetCount }))
        .filter(h => h.total > 0)
        .sort((a, b) => b.total - a.total);
      setHabitStats(hStats);

      const catMap = new Map<number, CategorStat>();
      for (const h of habitRows) {
        if (!catMap.has(h.categoryId)) {
          catMap.set(h.categoryId, { name: h.categoryName, color: h.categoryColor, total: 0 });
        }
        catMap.get(h.categoryId)!.total += Math.round(habitLogMap.get(h.id) ?? 0);
      }
      setCatStats(Array.from(catMap.values()).filter(c => c.total > 0));

      const dayMap = new Map<string, number>();
      for (const log of logs) {
        const ymd = toYMD(log.loggedAt);
        dayMap.set(ymd, (dayMap.get(ymd) ?? 0) + log.value);
      }
      setDayStats(Array.from(dayMap.entries()).map(([ymd, total]) => ({ ymd, total })));

      const total = logs.reduce((s, l) => s + l.value, 0);
      setTotalLogs(Math.round(total));

      let metCount = 0, totalDays = 0;
      for (const h of habitRows) {
        const habitDays = h.frequency === 'weekly' ? Math.ceil(days / 7) : days;
        totalDays += habitDays;
        const logged = habitLogMap.get(h.id) ?? 0;
        metCount += Math.min(habitDays, Math.round(logged / h.targetCount));
      }
      setCompletion(totalDays > 0 ? Math.round((metCount / totalDays) * 100) : 0);
      setTopHabit(hStats[0]?.name ?? '—');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const days     = periodDays(period);
  const catTotal = catStats.reduce((s, c) => s + c.total, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Insights</Text>
            <Text style={styles.headerSub}>Your habit data at a glance</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="pulse-outline" size={20} color={theme.primaryLight} />
          </View>
        </View>

        {/* Period pills */}
        <View style={styles.pillRow}>
          {(['7D', '30D', '90D'] as Period[]).map(p => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.pill, period === p && styles.pillActive]}
            >
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* Empty */}
        {!loading && !hasData && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={52} color={theme.textTertiary} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>
              Start logging habits and your insights will appear here.
            </Text>
          </View>
        )}

        {!loading && hasData && (
          <>
            {/* Summary strip */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { borderColor: theme.primaryLight + '33' }]}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.primaryLight + '18' }]}>
                  <Ionicons name="flash-outline" size={14} color={theme.primaryLight} />
                </View>
                <Text style={styles.summaryVal}>{totalLogs}</Text>
                <Text style={styles.summaryLbl}>TOTAL LOGS</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: theme.accent + '33' }]}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.accent + '18' }]}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={theme.accent} />
                </View>
                <Text style={styles.summaryVal}>{completion}%</Text>
                <Text style={styles.summaryLbl}>COMPLETION</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: theme.warning + '33' }]}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.warning + '18' }]}>
                  <Ionicons name="star-outline" size={14} color={theme.warning} />
                </View>
                <Text style={styles.summaryVal} numberOfLines={2} adjustsFontSizeToFit>
                  {topHabit.length > 10 ? topHabit.slice(0, 9) + '…' : topHabit}
                </Text>
                <Text style={styles.summaryLbl}>TOP HABIT</Text>
              </View>
            </View>

            {habitStats.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Completions per Habit</Text>
                <Text style={styles.chartSub}>Last {days} days · sorted by volume</Text>
                <BarChartCustom data={habitStats} theme={theme} />
              </View>
            )}

            {dayStats.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Activity Heatmap</Text>
                <Text style={styles.chartSub}>Darker = more logs · today outlined</Text>
                <ActivityHeatmap days={days} dayStats={dayStats} theme={theme} />
              </View>
            )}

            {catStats.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Logs by Category</Text>
                <Text style={styles.chartSub}>Stacked rings — each ring = one category</Text>
                <DonutRing data={catStats} total={catTotal} theme={theme} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
