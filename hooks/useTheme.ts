import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { AppTheme, getTheme } from '@/constants/theme';

const STORAGE_KEY = '@loop_theme';

export type UseThemeResult = {
  isDark: boolean;
  theme: AppTheme;
  toggleTheme: () => void;
};

export function useTheme(): UseThemeResult {
  const [isDark, setIsDark] = useState(true); // default dark on first launch

  // Load persisted preference once on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val !== null) {
        setIsDark(val === 'dark');
      }
    });
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  return { isDark, theme: getTheme(isDark), toggleTheme };
}
