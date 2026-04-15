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
import ScreenHeader from '@/components/ui/screen-header';
import { db } from '@/db/client';
import { categories as categoriesTable } from '@/db/schema';
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
        Animated.spring(translateY, { toValue: 0,  useNativeDriver: true, tension: 90, friction: 9 }),
        Animated.spring(scale,      { toValue: 1,  useNativeDriver: true, tension: 90, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1,  duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
        Animated.timing(scale,      { toValue: 0.85, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,  duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      <Ionicons name="checkmark-circle" size={15} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string; catName?: string; _t?: string }>();

  const [cats, setCats]         = useState<Category[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast]       = useState({ message: '', visible: false });

  // Per-card entrance animated values
  const entryAnims  = useRef<Map<number, Animated.Value>>(new Map());
  // Single animated value driving the exit animation of whichever card is being deleted
  const deleteAnim  = useRef(new Animated.Value(1)).current;
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTs      = useRef('');

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

      // Show toast when returning from the form with an action param
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
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(cat),
        },
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
      <ScreenHeader
        title="Categories"
        subtitle={cats.length > 0 ? `${cats.length} category${cats.length === 1 ? '' : 's'}` : undefined}
      />

      {cats.length > 0 && (
        <PrimaryButton label="Add Category" onPress={goToAdd} />
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {cats.length === 0 ? (
          // ── Empty state ──────────────────────────────────────────────────
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={52} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first category to start organising your habits.
            </Text>
            <View style={styles.emptyButton}>
              <PrimaryButton label="Add First Category" onPress={goToAdd} />
            </View>
          </View>
        ) : (
          // ── Category cards ───────────────────────────────────────────────
          cats.map(cat => {
            const entryAnim  = getEntryAnim(cat.id);
            const isDeleting = deletingId === cat.id;

            return (
              <Animated.View
                key={cat.id}
                style={[
                  styles.card,
                  {
                    opacity: isDeleting
                      ? deleteAnim
                      : entryAnim,
                    transform: isDeleting
                      ? [{ scale: deleteAnim }]
                      : [
                          {
                            translateY: entryAnim.interpolate({
                              inputRange:  [0, 1],
                              outputRange: [24, 0],
                            }),
                          },
                        ],
                  },
                ]}
              >
                {/* Colour + icon badge */}
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
                    <Ionicons name="create-outline" size={20} color="#0F766E" />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    onPress={() => handleDelete(cat)}
                    hitSlop={6}
                  >
                    <Ionicons name="trash-outline" size={20} color="#B91C1C" />
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
    backgroundColor: '#F8FAFC',
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  list: {
    flex: 1,
    marginTop: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  catName: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconBtnPressed: {
    backgroundColor: '#F3F4F6',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#111827',
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
  emptyButton: {
    marginTop: 24,
    width: '100%',
  },
  // Toast
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#111827',
    borderRadius: 100,
    bottom: 24,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    position: 'absolute',
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
