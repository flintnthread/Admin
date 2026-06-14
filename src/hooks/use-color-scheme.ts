import { useThemeContext } from '@/context/theme-context';

export function useColorScheme() {
  const { theme } = useThemeContext();
  return theme;
}
