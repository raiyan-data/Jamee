import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsSection } from "./SettingsSection";
import type { AppearanceMode } from "@/types/models";

const MODES: { value: AppearanceMode; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { value: "light", icon: "sun", label: "Light" },
  { value: "dark", icon: "moon", label: "Dark" },
  { value: "system", icon: "smartphone", label: "System" },
];

export function AppearanceSection() {
  const theme = useTheme();
  const { settings, updateSetting, isSavingKey } = useSettings();
  const isSaving = isSavingKey("appearance");

  return (
    <SettingsSection title="Appearance" testID="settings-appearance">
      <View style={styles.modes}>
        {MODES.map((mode) => {
          const isActive = settings.appearance === mode.value;
          return (
            <Pressable
              key={mode.value}
              onPress={() => !isSaving && updateSetting("appearance", mode.value)}
              style={[
                styles.modeCard,
                {
                  backgroundColor: isActive ? theme.primaryLight : theme.surfaceSecondary,
                  borderColor: isActive ? theme.primary : theme.borderLight,
                  opacity: isSaving ? 0.6 : 1,
                },
              ]}
              testID={`settings-appearance-${mode.value}`}
            >
              <Feather name={mode.icon} size={24} color={isActive ? theme.primary : theme.textSecondary} />
              <Text
                style={[
                  styles.modeLabel,
                  { color: isActive ? theme.primary : theme.textSecondary },
                ]}
              >
                {mode.label}
              </Text>
              {isActive && !isSaving && (
                <View style={[styles.check, { backgroundColor: theme.primary }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
              {isActive && isSaving && (
                <View style={styles.check}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  modes: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  modeCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    position: "relative" as const,
  },
  modeLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  check: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
