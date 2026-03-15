import { useColorScheme } from "react-native";
import Colors, { type ThemeColors } from "./colors";

export function useTheme(): ThemeColors & { isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  return { ...colors, isDark };
}
