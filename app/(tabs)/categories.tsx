import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

import PrimaryButton from '@/components/ui/primary-button';
import { db } from '@/db/client';
import { categories as categoriesTable } from '@/db/schema';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { eq } from 'drizzle-orm';

type Category = { id: number; name: string; color: string; icon: string };
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Toast ───────────────────────────────────────────────────────────────────

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
      <Ionicons name="checkmark-circle" size={15} color={Colors.accentLight} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string; catName?: string; _t?: string }>();

  const [cats, setCats]             = useState<Category[]>([]);
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

  const runEntryAnimations = (list: Category[]) => {
    list.forEach((cat, i) => {
      const anim = getEntryAnim(cat.id);
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

  const loadCategories = useCallback(async () => {
    const rows = await db.select().from(categoriesTable);
    setCats(rows);
    runEntryAnimations(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      if (params._t && params._t !== lastTs.current && params.action) {
        lastTs.current = params._t;
        const msg =
          params.action === 'created'
            ? `"${params.catName}" created`
            : `"${params.catName}" updated`;
        setTimeout(() => {
          showToast(msg);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 150);
      }
    }, [params._t]),
  );

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Habits assigned to this category will be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(cat) },
      ],
    );
  };

  const performDelete = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeletingId(cat.id);
    deleteAnim.setValue(1);

    Animated.timing(deleteAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(async ({ finished }) => {
      if (!finished) return;
      try {
        await db.delete(categoriesTable).where(eq(categoriesTable.id, cat.id));
        setCats(prev => prev.filter(c => c.id !== cat.id));
        showToast(`"${cat.name}" deleted`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert(
          'Cannot Delete',
          `"${cat.name}" may have habits attached to it. Remove those habits first.`,
        );
      } finally {
        setDeletingId(null);
        deleteAnim.setValue(1);
      }
    });
  };

  const goToAdd  = () => router.push('/category-form');
  const goToEdit = (cat: Category) =>
    router.push({ pathname: '/category-form', params: { id: String(cat.id) } });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        {/* Centred radial glow */}
        <View style={styles.glowOuter} />
        <View style={styles.glowInner} />

        {/* Loop wordmark — top right */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Loop</Text>
          <Text style={styles.wordmarkDot}>.</Text>
        </View>

        {/* Title block */}
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Categories</Text>
          <Text style={styles.heroSubtitle}>
            {cats.length === 0
              ? 'No categories yet'
              : `${cats.length} categor${cats.length === 1 ? 'y' : 'ies'}`}
          </Text>
        </View>

        {/* Full-width Add button */}
        {cats.length > 0 && (
          <View style={styles.heroAction}>
            <PrimaryButton label="Add Category" onPress={goToAdd} />
          </View>
        )}
      </View>

      {/* ── List ────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {cats.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <View style={styles.emptyGlow} />
              <Ionicons name="grid-outline" size={44} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first category to start organising your habits.
            </Text>
            <View style={styles.emptyButton}>
              <PrimaryButton label="Add First Category" onPress={goToAdd} />
            </View>
          </View>
        ) : (
          cats.map(cat => {
            const entryAnim  = getEntryAnim(cat.id);
            const isDeleting = deletingId === cat.id;

            return (
              <Animated.View
                key={cat.id}
                style={[
                  styles.card,
                  {
                    opacity: isDeleting ? deleteAnim : entryAnim,
                    transform: isDeleting
                      ? [{ scale: deleteAnim }]
                      : [{
                          translateY: entryAnim.interpolate({
                            inputRange:  [0, 1],
                            outputRange: [24, 0],
                          }),
                        }],
                  },
                ]}
              >
                {/* Colour + icon badge — solid rounded square */}
                <View style={[styles.badge, { backgroundColor: cat.color }]}>
                  <Ionicons
                    name={`${cat.icon}-outline` as IoniconsName}
                    size={20}
                    color="#fff"
                  />
                </View>

                {/* Name */}
                <Text style={styles.catName} numberOfLines={1}>
                  {cat.name}
                </Text>

                {/* Actions */}
                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    onPress={() => goToEdit(cat)}
                    hitSlop={6}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.primaryLight} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    onPress={() => handleDelete(cat)}
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </Pressable>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <Toast message={toast.message} visible={toast.visible} />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.background,
    flex: 1,
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    overflow: 'hidden',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  // Two-layer centred glow
  glowOuter: {
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    height: 120,
    left: '50%',
    marginLeft: -80,
    opacity: 0.1,
    position: 'absolute',
    top: -30,
    width: 160,
  },
  // Loop wordmark
  wordmarkRow: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  wordmark: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wordmarkDot: {
    color: Colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  heroContent: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.bodySize,
    marginTop: 4,
  },
  heroAction: {
    alignSelf: 'stretch',
  },

  // ── List ───────────────────────────────────────────────────────────────────
  list: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badge: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: 42,
    justifyContent: 'center',
    marginRight: 14,
    width: 42,
  },
  catName: {
    color: Colors.textPrimary,
    flex: 1,
    fontSize: Typography.headingSize,
    fontWeight: Typography.headingWeight,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
  },
  iconBtn: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconBtnPressed: {
    backgroundColor: Colors.surfaceElevated,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 88,
    width: 88,
  },
  emptyGlow: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    height: 72,
    left: 8,
    opacity: 0.15,
    position: 'absolute',
    top: 8,
    width: 72,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.bodySize,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    width: '100%',
  },

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    bottom: 24,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    position: 'absolute',
  },
  toastText: {
    color: Colors.textPrimary,
    fontSize: Typography.captionSize,
    fontWeight: '600',
  },
});
