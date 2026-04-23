import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FormField from '../components/ui/form-field';
import { ThemeContext } from '@/app/_layout';
import { DarkTheme } from '@/constants/theme';

const mockThemeValue = {
  isDark:      true,
  theme:       DarkTheme,
  toggleTheme: jest.fn(),
};

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={mockThemeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

describe('FormField', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <FormField label="Habit Name" value="" onChangeText={jest.fn()} />,
      { wrapper: ThemeWrapper },
    );
    expect(getByText('HABIT NAME')).toBeTruthy();
  });

  it('fires onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <FormField label="Habit Name" value="" onChangeText={onChangeText} />,
      { wrapper: ThemeWrapper },
    );

    fireEvent.changeText(getByPlaceholderText('Habit Name'), 'Morning Run');
    expect(onChangeText).toHaveBeenCalledWith('Morning Run');
  });

  it('uses a custom placeholder when provided', () => {
    const { getByPlaceholderText } = render(
      <FormField
        label="Notes"
        value=""
        onChangeText={jest.fn()}
        placeholder="Add a note…"
      />,
      { wrapper: ThemeWrapper },
    );
    expect(getByPlaceholderText('Add a note…')).toBeTruthy();
  });
});
