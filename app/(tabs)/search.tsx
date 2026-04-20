import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { and, eq, gte, like, lte, sql } from 'drizzle-orm';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { categories as categoriesTable, habitLogs, habits } from '@/db/schema';
import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: number; name: string; color: string; icon: string };

type LogResult = {
  logId: number;
  loggedAt: string;
  value: number;
  note: string | null;
  habitId: number;
  habitName: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Styles factory ───────────────────────────────────────────────────────────

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.background,
      flex: 1,
    },
    hero: {
      alignItems: 'flex-start',
      backgroundColor: theme.background,
      overflow: 'hidden',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    glowOuter: {
      backgroundColor: theme.primary,
      borderRadius: 999,
      height: 220,
      left: '50%',
      marginLeft: -140,
      opacity: 0.09,
      position: 'absolute',
      top: -80,
      width: 280,
    },
    glowInner: {
      backgroundColor: theme.primaryLight,
      borderRadius: 999,
      height: 120,
      left: '50%',
      marginLeft: -80,
      opacity: 0.1,
      position: 'absolute',
      top: -30,
      width: 160,
    },
    wordmarkRow: {
      alignItems: 'flex-end',
      alignSelf: 'flex-end',
      flexDirection: 'row',
      marginBottom: Spacing.sm,
    },
    wordmark: {
      color: theme.textTertiary,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    wordmarkDot: {
      color: theme.primaryLight,
      fontSize: 13,
      fontWeight: '700',
    },
    heroContent: {
      width: '100%',
    },
    heroTitle: {
      color: theme.textPrimary,
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1,
    },
    heroSubtitle: {
      color: theme.textSecondary,
      fontSize: Typography.bodySize,
      marginTop: 4,
    },
    filtersWrap: {
      backgroundColor: theme.background,
      gap: 10,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    searchBar: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: {
      color: theme.textPrimary,
      flex: 1,
      fontSize: Typography.bodySize,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chipsScroll: {
      gap: 8,
      paddingVertical: 2,
    },
    chip: {
      alignItems: 'center',
      borderRadius: Radius.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipDot: {
      borderRadius: 99,
      height: 7,
      width: 7,
    },
    chipText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    clearBtn: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    clearBtnPressed: {
      backgroundColor: theme.surfaceElevated,
    },
    clearText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    searchBtn: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: Radius.md,
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      paddingVertical: 11,
    },
    searchBtnPressed: {
      opacity: 0.85,
    },
    searchBtnText: {
      color: theme.textInverse,
      fontSize: 14,
      fontWeight: '700',
    },
    resultsHeader: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 8,
    },
    resultsLabel: {
      color: theme.textTertiary,
      fontSize: Typography.labelSize,
      fontWeight: Typography.labelWeight,
      letterSpacing: Typography.labelTracking,
      textTransform: 'uppercase',
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 32,
      flexGrow: 1,
    },
    card: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 10,
      overflow: 'hidden',
      paddingRight: 14,
      paddingVertical: 12,
    },
    accentBar: {
      borderRadius: 2,
      height: '100%',
      left: 0,
      position: 'absolute',
      width: 3,
    },
    badge: {
      alignItems: 'center',
      borderRadius: Radius.md,
      height: 40,
      justifyContent: 'center',
      marginLeft: 16,
      marginRight: 12,
      width: 40,
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    habitName: {
      color: theme.textPrimary,
      flex: 1,
      fontSize: Typography.headingSize,
      fontWeight: Typography.headingWeight,
    },
    valuePill: {
      borderRadius: Radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    valueText: {
      fontSize: 12,
      fontWeight: '700',
    },
    cardMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    metaText: {
      color: theme.textTertiary,
      fontSize: Typography.captionSize,
    },
    metaDot: {
      color: theme.textTertiary,
      fontSize: Typography.captionSize,
    },
    catChipSmall: {
      borderRadius: Radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    catChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    noteText: {
      color: theme.textSecondary,
      fontSize: Typography.captionSize,
      lineHeight: 18,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 40,
      paddingHorizontal: 24,
    },
    promptState: {
      alignItems: 'center',
      paddingTop: 40,
      paddingHorizontal: 24,
    },
    emptyIconWrap: {
      alignItems: 'center',
      height: 88,
      justifyContent: 'center',
      width: 88,
    },
    emptyGlow: {
      backgroundColor: theme.primary,
      borderRadius: 999,
      height: 72,
      left: 8,
      opacity: 0.15,
      position: 'absolute',
      top: 8,
      width: 72,
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

// ─── DateNav styles factory ───────────────────────────────────────────────────

function makeNavStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: { flex: 1, gap: 4 },
    label: {
      color: theme.textTertiary,
      fontSize: Typography.labelSize,
      fontWeight: Typography.labelWeight,
      letterSpacing: Typography.labelTracking,
      textTransform: 'uppercase',
    },
    control: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    arrow: { borderRadius: Radius.sm, padding: 2 },
    arrowPressed: { backgroundColor: theme.primaryDim },
    value: { color: theme.textPrimary, fontSize: 13, fontWeight: '600' },
  });
}

// ─── DateNav ─────────────────────────────────────────────────────────────────

function DateNav({
  label,
  value,
  onPrev,
  onNext,
  theme,
}: {
  label: string;
  value: Date;
  onPrev: () => void;
  onNext: () => void;
  theme: AppTheme;
}) {
  const nav = useMemo(() => makeNavStyles(theme), [theme]);

  return (
    <View style={nav.row}>
      <Text style={nav.label}>{label}</Text>
      <View style={nav.control}>
        <Pressable onPress={onPrev} hitSlop={8} style={({ pressed }) => [nav.arrow, pressed && nav.arrowPressed]}>
          <Ionicons name="chevron-back" size={16} color={theme.primaryLight} />
        </Pressable>
        <Text style={nav.value}>{fmtDate(isoDate(value))}</Text>
        <Pressable onPress={onNext} hitSlop={8} style={({ pressed }) => [nav.arrow, pressed && nav.arrowPressed]}>
          <Ionicons name="chevron-forward" size={16} color={theme.primaryLight} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({
  item,
  anim,
  theme,
}: {
  item: LogResult;
  anim: Animated.Value;
  theme: AppTheme;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: item.categoryColor }]} />

      <View style={[styles.badge, { backgroundColor: item.categoryColor + '26' }]}>
        <Ionicons
          name={`${item.categoryIcon}-outline` as IoniconsName}
          size={18}
          color={item.categoryColor}
        />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.habitName} numberOfLines={1}>{item.habitName}</Text>
          <View style={[styles.valuePill, { backgroundColor: item.categoryColor + '26' }]}>
            <Text style={[styles.valueText, { color: item.categoryColor }]}>
              +{item.value % 1 === 0 ? item.value.toFixed(0) : item.value.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <Ionicons name="calendar-outline" size={12} color={theme.textTertiary} />
          <Text style={styles.metaText}>{fmtDate(item.loggedAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <View style={[styles.catChipSmall, { backgroundColor: item.categoryColor + '20' }]}>
            <Text style={[styles.catChipText, { color: item.categoryColor }]}>{item.categoryName}</Text>
          </View>
        </View>

        {item.note ? (
          <Text style={styles.noteText} numberOfLines={2}>{item.note}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { theme }   = useAppTheme();
  const styles      = useMemo(() => makeStyles(theme), [theme]);

  const today        = new Date();
  const thirtyDaysAgo = addDays(today, -30);

  const [query, setQuery]               = useState('');
  const [fromDate, setFromDate]         = useState(thirtyDaysAgo);
  const [toDate, setToDate]             = useState(today);
  const [cats, setCats]                 = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<number>>(new Set());
  const [results, setResults]           = useState<LogResult[]>([]);
  const [hasSearched, setHasSearched]   = useState(false);

  const cardAnims = useRef<Map<number, Animated.Value>>(new Map());

  const getCardAnim = (logId: number) => {
    if (!cardAnims.current.has(logId)) {
      cardAnims.current.set(logId, new Animated.Value(0));
    }
    return cardAnims.current.get(logId)!;
  };

  const runStagger = (list: LogResult[]) => {
    list.forEach((item, i) => {
      const anim = getCardAnim(item.logId);
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1, delay: i * 45, useNativeDriver: true, tension: 70, friction: 11,
      }).start();
    });
  };

  useFocusEffect(
    useCallback(() => {
      db.select().from(categoriesTable).then(rows => setCats(rows));
    }, []),
  );

  const toggleCat = (id: number) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSearch = async () => {
    setHasSearched(true);
    cardAnims.current.clear();

    const conditions = [
      gte(habitLogs.loggedAt, isoDate(fromDate)),
      lte(habitLogs.loggedAt, isoDate(toDate)),
    ];

    if (query.trim()) {
      conditions.push(like(habits.name, `%${query.trim()}%`));
    }

    if (selectedCats.size > 0) {
      conditions.push(
        sql`${habits.categoryId} IN (${sql.join(
          [...selectedCats].map(id => sql`${id}`),
          sql`, `,
        )})`,
      );
    }

    const rows = await db
      .select({
        logId:         habitLogs.id,
        loggedAt:      habitLogs.loggedAt,
        value:         habitLogs.value,
        note:          habitLogs.note,
        habitId:       habits.id,
        habitName:     habits.name,
        categoryId:    categoriesTable.id,
        categoryName:  categoriesTable.name,
        categoryColor: categoriesTable.color,
        categoryIcon:  categoriesTable.icon,
      })
      .from(habitLogs)
      .innerJoin(habits, eq(habitLogs.habitId, habits.id))
      .innerJoin(categoriesTable, eq(habits.categoryId, categoriesTable.id))
      .where(and(...conditions))
      .orderBy(sql`${habitLogs.loggedAt} DESC`);

    setResults(rows);
    setTimeout(() => runStagger(rows), 50);
  };

  const handleClear = () => {
    setQuery('');
    setFromDate(thirtyDaysAgo);
    setToDate(today);
    setSelectedCats(new Set());
    setResults([]);
    setHasSearched(false);
    cardAnims.current.clear();
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.glowOuter} />
        <View style={styles.glowInner} />
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Loop</Text>
          <Text style={styles.wordmarkDot}>.</Text>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Search</Text>
          <Text style={styles.heroSubtitle}>Filter your habit logs</Text>
        </View>
      </View>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <View style={styles.filtersWrap}>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search habit name…"
            placeholderTextColor={theme.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.dateRow}>
          <DateNav
            label="From"
            value={fromDate}
            onPrev={() => setFromDate(d => addDays(d, -1))}
            onNext={() => setFromDate(d => addDays(d, +1))}
            theme={theme}
          />
          <DateNav
            label="To"
            value={toDate}
            onPrev={() => setToDate(d => addDays(d, -1))}
            onNext={() => setToDate(d => addDays(d, +1))}
            theme={theme}
          />
        </View>

        {cats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {cats.map(cat => {
              const active = selectedCats.has(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCat(cat.id)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: cat.color + '30', borderColor: cat.color }
                      : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.chipText, active && { color: cat.color }]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            onPress={handleClear}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
            <Text style={styles.clearText}>Reset</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
            onPress={handleSearch}
          >
            <Ionicons name="search" size={16} color={theme.textInverse} />
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Results header ─────────────────────────────────────────────────── */}
      {hasSearched && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsLabel}>
            {results.length === 0
              ? 'No results'
              : `${results.length} log${results.length === 1 ? '' : 's'} found`}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => String(item.logId)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ResultCard item={item} anim={getCardAnim(item.logId)} theme={theme} />
        )}
        ListEmptyComponent={
          hasSearched ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <View style={styles.emptyGlow} />
                <Ionicons name="search-outline" size={44} color={theme.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No logs found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search term, date range, or category filters.
              </Text>
            </View>
          ) : (
            <View style={styles.promptState}>
              <View style={styles.emptyIconWrap}>
                <View style={styles.emptyGlow} />
                <Ionicons name="filter-outline" size={44} color={theme.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Filter your logs</Text>
              <Text style={styles.emptySubtitle}>
                Use the filters above to search through your habit activity.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
