import React, { type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/constants/theme";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  testID?: string;
}

export function SettingsSection({ title, children, testID }: SettingsSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <Text style={[styles.title, { color: theme.primary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
