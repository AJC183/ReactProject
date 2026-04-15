import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/components/ui/primary-button';
import ScreenHeader from '@/components/ui/screen-header';
import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { eq } from 'drizzle-orm';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#607D8B', // Slate
];

const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'heart',          label: 'Health'   },
  { name: 'barbell',        label: 'Fitness'  },
  { name: 'leaf',           label: 'Nature'   },
  { name: 'book-open',      label: 'Learning' },
  { name: 'briefcase',      label: 'Work'     },
  { name: 'home',           label: 'Home'     },
  { name: 'musical-notes',  label: 'Music'    },
  { name: 'bicycle',        label: 'Exercise' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CategoryFormScreen() {
  const router   = useRouter();
  const { id }   = useLocalSearchParams<{ id?: string }>();
  const isEdit   = Boolean(id);

  const [name,          setName]          = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon,  setSelectedIcon]  = useState(ICON_OPTIONS[0].name);
  const [loading,       setLoading]       = useState(false);

  // Per-swatch and per-icon bounce animated values
  const swatchAnims = useRef(
    Object.fromEntries(PRESET_COLORS.map(c => [c, new Animated.Value(1)])),
  ).current;

  const iconAnims = useRef(
    Object.fromEntries(ICON_OPTIONS.map(o => [o.name, new Animated.Value(1)])),
  ).current;

  // Preview badge scale — pops when either color or icon changes
  const previewAnim = useRef(new Animated.Value(1)).current;

  // ── Load existing category if editing ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, Number(id)));
      if (cat) {
        setName(cat.name);
        setSelectedColor(cat.color);
        setSelectedIcon(cat.icon);
      }
    })();
  }, [id]);

  // ── Animation helpers ──────────────────────────────────────────────────────

  const popPreview = () => {
    previewAnim.setValue(0.8);
    Animated.spring(previewAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 7,
    }).start();
  };

  const selectColor = (color: string) => {
    setSelectedColor(color);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const anim = swatchAnims[color];
    anim.setValue(0.65);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 7,
    }).start();
    popPreview();
  };

  const selectIcon = (iconName: string) => {
    setSelectedIcon(iconName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const anim = iconAnims[iconName];
    anim.setValue(0.65);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 7,
    }).start();
    popPreview();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this category.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isEdit) {
        await db
          .update(categories)
          .set({ name: name.trim(), color: selectedColor, icon: selectedIcon })
          .where(eq(categories.id, Number(id)));
      } else {
        await db
          .insert(categories)
          .values({ name: name.trim(), color: selectedColor, icon: selectedIcon });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.navigate({
        pathname: '/(tabs)/categories',
        params: {
          action:  isEdit ? 'updated' : 'created',
          catName: name.trim(),
          _t:      Date.now().toString(),
        },
      });
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={isEdit ? 'Edit Category' : 'New Category'}
        subtitle={isEdit ? 'Update the details below.' : 'Fill in the details below.'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Live preview badge ─────────────────────────────────────────── */}
        <View style={styles.previewRow}>
          <Animated.View
            style={[
              styles.previewBadge,
              { backgroundColor: selectedColor, transform: [{ scale: previewAnim }] },
            ]}
          >
            <Ionicons
              name={`${selectedIcon}-outline` as IoniconsName}
              size={32}
              color="#fff"
            />
          </Animated.View>
          <Text style={styles.previewLabel}>
            {name.trim() || 'Category preview'}
          </Text>
        </View>

        {/* ── Name ──────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Morning Routine"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />

        {/* ── Colour picker ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Colour</Text>
        <View style={styles.swatchRow}>
          {PRESET_COLORS.map(color => {
            const isSelected = selectedColor === color;
            return (
              <Animated.View
                key={color}
                style={{ transform: [{ scale: swatchAnims[color] }] }}
              >
                <Pressable
                  onPress={() => selectColor(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    isSelected && styles.swatchSelected,
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Icon picker ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map(opt => {
            const isSelected = selectedIcon === opt.name;
            return (
              <Animated.View
                key={opt.name}
                style={[
                  styles.iconOptionWrapper,
                  { transform: [{ scale: iconAnims[opt.name] }] },
                ]}
              >
                <Pressable
                  onPress={() => selectIcon(opt.name)}
                  style={[
                    styles.iconOption,
                    isSelected && { backgroundColor: selectedColor },
                  ]}
                >
                  <Ionicons
                    name={`${opt.name}-outline` as IoniconsName}
                    size={22}
                    color={isSelected ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.iconLabel,
                      isSelected && styles.iconLabelSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Submit / Cancel ───────────────────────────────────────────── */}
        <View style={styles.buttons}>
          <PrimaryButton
            label={loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
            onPress={handleSubmit}
          />
          <View style={styles.cancelBtn}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Preview
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewBadge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  previewLabel: {
    color: '#374151',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  // Name field
  sectionLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // Colour swatches
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  swatch: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  swatchSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  // Icon grid (4 columns)
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  iconOptionWrapper: {
    width: '22%',
  },
  iconOption: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    gap: 4,
    paddingVertical: 10,
  },
  iconLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '500',
  },
  iconLabelSelected: {
    color: '#fff',
  },
  // Buttons
  buttons: {
    gap: 10,
  },
  cancelBtn: {
    marginTop: 2,
  },
});
