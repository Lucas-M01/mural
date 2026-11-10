import { useColorScheme } from 'nativewind';
import tokens from './tokens.json';

export function useTheme() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return { dark, colors: dark ? tokens.dark : tokens.light };
}
