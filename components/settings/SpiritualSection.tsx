import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

export function SpiritualSection() {
  const theme = useTheme();
  const { settings, updateSetting, isSavingKey } = useSettings();

  const formatMinutes = (min: number) => {
    if (min >= 120) return `${Math.round(min / 60)}h`;
    if (min >= 60) return `1h ${min - 60}m`;
    return `${min}m`;
  };

  return (
    <SettingsSection title="Spiritual Wellbeing" testID="settings-spiritual">
      <View style={[styles.sliderRow, { borderBottomColor: theme.borderLight }]}>
        <View style={styles.sliderHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Feather name="clock" size={18} color={theme.primary} />
          </View>
          <View style={styles.sliderLabelWrap}>
            <Text style={[styles.sliderLabel, { color: theme.text }]}>Daily Usage Limit</Text>
            <Text style={[styles.sliderValue, { color: theme.primary }]}>
              {formatMinutes(settings.daily_limit_minutes)}
            </Text>
          </View>
        </View>
        <View style={styles.sliderContainer}>
          <View style={[styles.trackBg, { backgroundColor: theme.surfaceSecondary }]}>
            <View
              style={[
                styles.trackFill,
                {
                  backgroundColor: theme.primary,
                  width: `${((settings.daily_limit_minutes - 15) / (180 - 15)) * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.tickRow}>
            {[15, 30, 60, 90, 120, 180].map((val) => (
              <View
                key={val}
                style={[
                  styles.tick,
                  { backgroundColor: settings.daily_limit_minutes >= val ? theme.primary : theme.border },
                ]}
              />
            ))}
          </View>
          <View style={styles.labelRow}>
            {[15, 30, 60, 90, 120, 180].map((val) => (
              <Text
                key={val}
                style={[
                  styles.tickLabel,
                  {
                    color: settings.daily_limit_minutes === val ? theme.primary : theme.textTertiary,
                    opacity: isSavingKey("daily_limit_minutes") ? 0.5 : 1,
                  },
                ]}
                onPress={() => !isSavingKey("daily_limit_minutes") && updateSetting("daily_limit_minutes", val)}
                testID={`settings-limit-${val}`}
              >
                {formatMinutes(val)}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <SettingsRow
        icon="bell"
        label="Reminder Nudges"
        subtitle="Get gentle reminders when approaching your limit"
        isToggle
        toggleValue={settings.reminder_nudges}
        onToggle={(val) => updateSetting("reminder_nudges", val)}
        isSaving={isSavingKey("reminder_nudges")}
        testID="settings-nudges"
      />
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sliderRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sliderLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sliderLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  sliderValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sliderContainer: {
    paddingHorizontal: 4,
  },
  trackBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 2,
  },
  tick: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tickLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
