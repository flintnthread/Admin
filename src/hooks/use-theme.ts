import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/context/theme-context';

export function useTheme() {
  const { theme } = useThemeContext();
  const colors = Colors[theme];
  if (!colors) {
    console.error('useTheme: Invalid theme value:', theme);
    return Colors.light;
  }
  return colors;
}
