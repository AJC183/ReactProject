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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { categories as categoriesTable, habits as habitsTable } from '@/db/schema';

type Category  = { id: number; name: string; color: string; icon: string };
type Frequency = 'daily' | 'weekly';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function HabitForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories]   = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [frequency, setFrequency]     = useState<Frequency>('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [saving, setSaving]           = useState(false);

  // Per-category bounce
  const catAnims = useRef<Map<number, Animated.Value>>(new Map());
  const getCatAnim = (catId: number) => {
    if (!catAnims.current.has(catId)) catAnims.current.set(catId, new Animated.Value(1));
    return catAnims.current.get(catId)!;
  };
  const bounceCat = (catId: number) => {
    const anim = getCatAnim(catId);
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  useEffect(() => {
    (async () => {
      const cats = await db.select().from(categoriesTable);
      setCategories(cats);

      if (isEdit && id) {
        const rows = await db
          .select()
          .from(habitsTable)
          .where(eq(habitsTable.id, parseInt(id)));
        if (rows.length > 0) {
          const h = rows[0];
          setName(h.name);
          setDescription(h.description ?? '');
          setSelectedCat(h.categoryId);
          setFrequency(h.frequency as Frequency);
          setTargetCount(h.targetCount);
        }
      } else if (cats.length > 0) {
        setSelectedCat(cats[0].id);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a habit name.');
      return;
    }
    if (!selectedCat) {
      Alert.alert('Missing Category', 'Please select a category.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await db
          .update(habitsTable)
          .set({
            name:        name.trim(),
            description: description.trim() || null,
            categoryId:  selectedCat,
            frequency,
            targetCount,
          })
          .where(eq(habitsTable.id, parseInt(id)));
      } else {
        await db.insert(habitsTable).values({
          name:        name.trim(),
          description: description.trim() || null,
          categoryId:  selectedCat,
          frequency,
          targetCount,
          createdAt:   new Date().toISOString(),
          isActive:    true,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.navigate({
        pathname: '/(tabs)',
        params: {
          action:    isEdit ? 'updated' : 'created',
          habitName: name.trim(),
          _t:        String(Date.now()),
        },
      });
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCatObj = categories.find(c => c.id === selectedCat);

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
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Habit' : 'New Habit'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Live preview badge */}
        {selectedCatObj && (
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewBadge,
                {
                  backgroundColor: selectedCatObj.color + '18',
                  borderColor:     selectedCatObj.color + '44',
                },
              ]}
            >
              <Ionicons
                name={`${selectedCatObj.icon}-outline` as IoniconsName}
                size={20}
                color={selectedCatObj.color}
              />
              <Text style={[styles.previewName, { color: selectedCatObj.color }]}>
                {name.trim() || 'Habit name'}
              </Text>
            </View>
          </View>
        )}

        {/* Name */}
        <Text style={styles.label}>Habit Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Morning run"
          placeholderTextColor="#4B5563"
          maxLength={60}
        />

        {/* Description */}
        <Text style={styles.label}>
          Description{' '}
          <Text style={styles.optional}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What does this habit involve?"
          placeholderTextColor="#4B5563"
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        {categories.length === 0 ? (
          <Text style={styles.noCats}>
            No categories yet — create one in the Categories tab first.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catScrollContent}
          >
            {categories.map(c => {
              const selected = c.id === selectedCat;
              return (
                <Animated.View
                  key={c.id}
                  style={{ transform: [{ scale: getCatAnim(c.id) }] }}
                >
                  <Pressable
                    style={[
                      styles.catChip,
                      selected && {
                        backgroundColor: c.color + '22',
                        borderColor:     c.color,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCat(c.id);
                      bounceCat(c.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={`${c.icon}-outline` as IoniconsName}
                      size={15}
                      color={selected ? c.color : '#6B7280'}
                    />
                    <Text
                      style={[styles.catChipText, selected && { color: c.color }]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        {/* Frequency */}
        <Text style={styles.label}>Frequency</Text>
        <View style={styles.freqRow}>
          {(['daily', 'weekly'] as Frequency[]).map(f => (
            <Pressable
              key={f}
              style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
              onPress={() => {
                setFrequency(f);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.freqBtnText,
                  frequency === f && styles.freqBtnTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Target count */}
        <Text style={styles.label}>
          {frequency === 'daily' ? 'Daily' : 'Weekly'} Target
        </Text>
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
            <Ionicons
              name="remove"
              size={22}
              color={targetCount <= 1 ? '#374151' : '#F1F5F9'}
            />
          </Pressable>

          <View style={styles.stepperValueWrap}>
            <Text style={styles.stepperValue}>{targetCount}</Text>
            <Text style={styles.stepperUnit}>
              {targetCount === 1 ? 'time' : 'times'}
            </Text>
          </View>

          <Pressable
            style={[styles.stepperBtn, targetCount >= 99 && styles.stepperBtnDisabled]}
            onPress={() => {
              if (targetCount < 99) {
                setTargetCount(t => t + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            disabled={targetCount >= 99}
          >
            <Ionicons
              name="add"
              size={22}
              color={targetCount >= 99 ? '#374151' : '#F1F5F9'}
            />
          </Pressable>
        </View>

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
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Habit'}
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
    paddingBottom: 40,
  },
  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 22,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Form fields
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optional: {
    color: '#4B5563',
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
  },
  input: {
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F1F5F9',
    fontSize: 15,
    marginBottom: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    height: 88,
    textAlignVertical: 'top',
  },
  noCats: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 22,
  },
  // Category chips
  catScroll: {
    marginBottom: 22,
  },
  catScrollContent: {
    paddingRight: 8,
  },
  catChip: {
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
  catChipText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  // Frequency
  freqRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  freqBtn: {
    alignItems: 'center',
    backgroundColor: '#181821',
    borderColor: '#252532',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  freqBtnActive: {
    backgroundColor: '#0F766E22',
    borderColor: '#0F766E',
  },
  freqBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  freqBtnTextActive: {
    color: '#0F766E',
  },
  // Stepper
  stepperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 36,
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
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValueWrap: {
    alignItems: 'center',
    minWidth: 72,
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
  // Save
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 14,
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
