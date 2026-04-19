import React from 'react';
import { render } from '@testing-library/react-native';
import HabitsScreen from '../app/(tabs)/index';

// ── Mock the database ─────────────────────────────────────────────────────────
jest.mock('@/db/client', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
        groupBy: jest.fn().mockResolvedValue([]),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// ── Mock Expo and navigation modules ──────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter:            () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect:       jest.fn(),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-haptics', () => ({
  impactAsync:              jest.fn(),
  notificationAsync:        jest.fn(),
  ImpactFeedbackStyle:      { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// ── Mock SettingsPanel (uses expo-router internals) ────────────────────────────
jest.mock('@/components/ui/settings-panel', () => {
  const { View } = require('react-native');
  return () => <View />;
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('HabitsScreen', () => {
  it('renders the Habits heading', () => {
    const { getByText } = render(<HabitsScreen />);
    expect(getByText('Habits')).toBeTruthy();
  });

  it('renders the empty state when there are no habits', () => {
    // "No habits yet" appears in both the header subtitle and the empty-state
    // body title — getAllByText handles the duplicate gracefully
    const { getAllByText } = render(<HabitsScreen />);
    const matches = getAllByText('No habits yet');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the empty-state prompt to use the FAB', () => {
    const { getByText } = render(<HabitsScreen />);
    expect(
      getByText('Tap + to create your first habit and start tracking your progress.')
    ).toBeTruthy();
  });
});
