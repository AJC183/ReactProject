import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/app/_layout';
import { useAppTheme } from '@/app/_layout';
import { AppTheme, Radius, Spacing, Typography } from '@/constants/theme';
import { db } from '@/db/client';
import { habits as habitsTable, categories as categoriesTable } from '@/db/schema';
import { fetchDailyQuote, fetchWeather, type DailyQuote, type WeatherData } from '@/utils/api';
import { eq } from 'drizzle-orm';

// ── Types ─────────────────────────────────────────────────────────────────────

type HabitSuggestion = {
  id:   number;
  name: string;
  color: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });
}

function weatherTip(condition: string): string {
  switch (condition) {
    case 'Clear':
      return 'Based on today\'s weather, here are your best habits to focus on:';
    case 'Clouds':
      return 'Based on today\'s weather, here are your best habits to focus on:';
    case 'Rain':
    case 'Drizzle':
      return 'Rainy day - great time to focus on these habits:';
    case 'Snow':
      return 'Cold outside - perfect for these indoor habits:';
    case 'Thunderstorm':
      return 'Stay safe indoors - focus on these habits today:';
    default:
      return 'Based on today\'s weather, here are your best habits to focus on:';
  }
}

function isOutdoorCondition(condition: string): boolean {
  return condition === 'Clear' || condition === 'Clouds';
}

function weatherIconName(condition: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (condition) {
    case 'Clear':        return 'sunny';
    case 'Clouds':       return 'cloudy';
    case 'Rain':         return 'rainy';
    case 'Drizzle':      return 'rainy';
    case 'Snow':         return 'snow';
    case 'Thunderstorm': return 'thunderstorm';
    default:             return 'partly-sunny';
  }
}

function weatherAccentColor(condition: string, theme: AppTheme): string {
  switch (condition) {
    case 'Clear':        return theme.warning;
    case 'Clouds':       return theme.textSecondary;
    case 'Rain':
    case 'Drizzle':      return theme.primaryLight;
    case 'Snow':         return theme.textPrimary;
    case 'Thunderstorm': return theme.danger;
    default:             return theme.accent;
  }
}

// ── Styles factory ────────────────────────────────────────────────────────────

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.background,
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: 56,
    },

    // ── Hero ──────────────────────────────────────────────────────────────
    hero: {
      marginBottom: Spacing.lg,
      overflow: 'hidden',
      paddingBottom: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
    },
    glow: {
      borderRadius: 160,
      height: 200,
      left: -60,
      opacity: 0.18,
      position: 'absolute',
      top: -60,
      width: 280,
    },
    wordmark: {
      color: theme.primaryLight,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 4,
      marginBottom: Spacing.lg,
      opacity: 0.6,
      textTransform: 'uppercase',
    },
    greetingText: {
      color: theme.textPrimary,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    usernameText: {
      color: theme.primaryLight,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    heroDate: {
      color: theme.textSecondary,
      fontSize: Typography.captionSize,
      fontWeight: '500',
      marginTop: 6,
    },
    heroDivider: {
      backgroundColor: theme.border,
      height: 1,
      marginTop: Spacing.lg,
      opacity: 0.5,
    },

    // ── Cards ─────────────────────────────────────────────────────────────
    cardWrap: {
      marginBottom: Spacing.lg,
      marginHorizontal: Spacing.lg,
    },
    card: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: Radius.xl,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    cardLabel: {
      color: theme.textTertiary,
      fontSize: Typography.labelSize,
      fontWeight: Typography.labelWeight,
      letterSpacing: Typography.labelTracking,
      textTransform: 'uppercase',
    },
    cardBody: {
      paddingBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
    },

    // ── Quote ─────────────────────────────────────────────────────────────
    quoteIconRow: {
      marginBottom: Spacing.sm,
    },
    quoteText: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.2,
      lineHeight: 28,
      marginBottom: Spacing.md,
    },
    quoteFooter: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    authorTag: {
      alignItems: 'center',
      backgroundColor: theme.primaryDim,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    authorText: {
      color: theme.primaryLight,
      fontSize: 12,
      fontWeight: '700',
    },
    refreshBtn: {
      alignItems: 'center',
      borderColor: theme.border,
      borderRadius: Radius.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    refreshBtnText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },

    // ── Weather ───────────────────────────────────────────────────────────
    weatherHero: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
    },
    weatherIconWrap: {
      alignItems: 'center',
      borderRadius: Radius.lg,
      height: 72,
      justifyContent: 'center',
      width: 72,
    },
    weatherTempBlock: {
      flex: 1,
    },
    weatherTemp: {
      color: theme.textPrimary,
      fontSize: 48,
      fontWeight: '800',
      letterSpacing: -2,
      lineHeight: 52,
    },
    weatherTempUnit: {
      color: theme.textSecondary,
      fontSize: 20,
      fontWeight: '500',
    },
    weatherDesc: {
      color: theme.textSecondary,
      fontSize: Typography.bodySize,
      fontWeight: '500',
      marginTop: 2,
      textTransform: 'capitalize',
    },
    weatherCity: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
      marginTop: 3,
    },
    weatherCityText: {
      color: theme.textTertiary,
      fontSize: Typography.captionSize,
    },
    weatherDivider: {
      backgroundColor: theme.border,
      height: 1,
      marginBottom: Spacing.md,
      marginHorizontal: Spacing.md,
      opacity: 0.5,
    },
    tipLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
      marginBottom: Spacing.sm,
      marginHorizontal: Spacing.md,
    },
    habitSuggestion: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: 8,
      marginHorizontal: Spacing.md,
    },
    habitDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    habitSuggestionText: {
      color: theme.textPrimary,
      fontSize: Typography.captionSize,
      fontWeight: '600',
    },
    noHabitsText: {
      color: theme.textTertiary,
      fontSize: Typography.captionSize,
      marginHorizontal: Spacing.md,
    },

    // ── Loading / error ───────────────────────────────────────────────────
    centred: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
    },
    errorText: {
      color: theme.textSecondary,
      fontSize: Typography.captionSize,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    retryBtn: {
      alignItems: 'center',
      backgroundColor: theme.primaryDim,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
    },
    retryText: {
      color: theme.primaryLight,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { theme }  = useAppTheme();
  const { user }   = useAuth();
  const styles     = useMemo(() => makeStyles(theme), [theme]);

  const [quote,          setQuote]          = useState<DailyQuote | null>(null);
  const [quoteLoading,   setQuoteLoading]   = useState(true);
  const [quoteError,     setQuoteError]     = useState<string | null>(null);

  const [weather,        setWeather]        = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError,   setWeatherError]   = useState<string | null>(null);

  const [suggestions,    setSuggestions]    = useState<HabitSuggestion[]>([]);

  const [refreshing,     setRefreshing]     = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const q = await fetchDailyQuote();
      setQuote(q);
    } catch {
      setQuoteError('Could not load quote. Tap to retry.');
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      let coords: { latitude: number; longitude: number } | null = null;

      const ipRes  = await fetch('http://ip-api.com/json/?fields=lat,lon,status');
      const ipData = await ipRes.json();
      if (ipData.status === 'success') {
        coords = { latitude: ipData.lat, longitude: ipData.lon };
      }

      if (!coords) {
        setWeatherError('Could not determine location. Please try again.');
        return;
      }

      const w = await fetchWeather(coords.latitude, coords.longitude);
      setWeather(w);

      // Load habit suggestions keyed to weather condition
      const outdoor = isOutdoorCondition(w.condition);
      const allHabits = await db
        .select({
          id:    habitsTable.id,
          name:  habitsTable.name,
          color: categoriesTable.color,
        })
        .from(habitsTable)
        .innerJoin(categoriesTable, eq(habitsTable.categoryId, categoriesTable.id))
        .where(eq(habitsTable.isActive, true));

      // Prefer outdoor-sounding habits when clear/cloudy, indoor when bad weather
      const outdoorKeywords = ['walk', 'run', 'jog', 'cycle', 'bike', 'hike', 'outdoor', 'sport', 'gym', 'exercise'];
      const indoorKeywords  = ['read', 'meditat', 'journal', 'sleep', 'study', 'stretch', 'breath', 'water', 'vitamins', 'cook', 'clean'];

      const keywords = outdoor ? outdoorKeywords : indoorKeywords;

      let matched = allHabits.filter(h =>
        keywords.some(k => h.name.toLowerCase().includes(k)),
      );

      // If no keyword match, just take any 3 habits
      if (matched.length === 0) matched = allHabits;

      setSuggestions(matched.slice(0, 3));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('API key not set')) {
        setWeatherError('Add your OpenWeatherMap API key to .env to enable weather.');
      } else if (msg.includes('401')) {
        setWeatherError('API key not yet active. New keys can take up to 2 hours to activate.');
      } else {
        setWeatherError('Could not load weather. Please try again.');
      }
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQuote();
      loadWeather();
    }, [loadQuote, loadWeather]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadQuote(), loadWeather()]);
    setRefreshing(false);
  }, [loadQuote, loadWeather]);

  // ── Render ────────────────────────────────────────────────────────────────

  const accentColor = weather ? weatherAccentColor(weather.condition, theme) : theme.primaryLight;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primaryLight}
            colors={[theme.primaryLight]}
          />
        }
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Radial glow — simulated with a large tinted rounded view */}
          <View style={[styles.glow, { backgroundColor: theme.primary }]} />

          <Text style={styles.wordmark}>Loop</Text>

          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.usernameText}>
            {user?.username ?? 'there'}
          </Text>
          <Text style={styles.heroDate}>{formatDate()}</Text>
          <View style={styles.heroDivider} />
        </View>

        {/* ── Quote card ───────────────────────────────────────────────── */}
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Daily Motivation</Text>
              {!quoteLoading && !quoteError && (
                <Pressable style={styles.refreshBtn} onPress={loadQuote}>
                  <Ionicons name="refresh-outline" size={12} color={theme.textSecondary} />
                  <Text style={styles.refreshBtnText}>New quote</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.cardBody}>
              {quoteLoading ? (
                <View style={styles.centred}>
                  <ActivityIndicator color={theme.primaryLight} />
                </View>
              ) : quoteError ? (
                <View style={styles.centred}>
                  <Text style={styles.errorText}>{quoteError}</Text>
                  <Pressable style={styles.retryBtn} onPress={loadQuote}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : quote ? (
                <>
                  <View style={styles.quoteIconRow}>
                    <Ionicons name="chatbox-ellipses-outline" size={22} color={theme.primaryLight} />
                  </View>
                  <Text style={styles.quoteText}>{quote.quote}</Text>
                  <View style={styles.quoteFooter}>
                    <View style={styles.authorTag}>
                      <Ionicons name="person-outline" size={11} color={theme.primaryLight} />
                      <Text style={styles.authorText}>{quote.author}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Weather card ─────────────────────────────────────────────── */}
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Local Weather</Text>
              {!weatherLoading && !weatherError && (
                <Pressable style={styles.refreshBtn} onPress={loadWeather}>
                  <Ionicons name="refresh-outline" size={12} color={theme.textSecondary} />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </Pressable>
              )}
            </View>

            {weatherLoading ? (
              <View style={styles.centred}>
                <ActivityIndicator color={theme.primaryLight} />
              </View>
            ) : weatherError ? (
              <View style={[styles.centred, { paddingHorizontal: Spacing.md }]}>
                <Text style={styles.errorText}>{weatherError}</Text>
                {!weatherError.includes('API key') && (
                  <Pressable style={styles.retryBtn} onPress={loadWeather}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                )}
              </View>
            ) : weather ? (
              <>
                {/* Temperature + icon hero row */}
                <View style={styles.weatherHero}>
                  <View style={[styles.weatherIconWrap, { backgroundColor: accentColor + '18' }]}>
                    <Ionicons
                      name={weatherIconName(weather.condition)}
                      size={42}
                      color={accentColor}
                    />
                  </View>
                  <View style={styles.weatherTempBlock}>
                    <Text style={styles.weatherTemp}>
                      {weather.temp}
                      <Text style={styles.weatherTempUnit}> C</Text>
                    </Text>
                    <Text style={styles.weatherDesc}>{weather.description}</Text>
                    {weather.city ? (
                      <View style={styles.weatherCity}>
                        <Ionicons name="location-outline" size={11} color={theme.textTertiary} />
                        <Text style={styles.weatherCityText}>{weather.city}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.weatherDivider} />

                {/* Habit suggestions */}
                <Text style={styles.tipLabel}>{weatherTip(weather.condition)}</Text>

                {suggestions.length > 0 ? (
                  suggestions.map(h => (
                    <View key={h.id} style={styles.habitSuggestion}>
                      <View style={[styles.habitDot, { backgroundColor: h.color }]} />
                      <Text style={styles.habitSuggestionText}>{h.name}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noHabitsText, { marginBottom: Spacing.md }]}>
                    Add some habits to see personalised suggestions here.
                  </Text>
                )}

                <View style={{ height: Spacing.sm }} />
              </>
            ) : null}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
