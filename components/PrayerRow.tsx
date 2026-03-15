import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from "react-native-reanimated";
import { useTheme } from "@/constants/theme";
import type { PrayerName } from "@/constants/mockData";

const PRAYER_TIMES: Record<PrayerName, string> = {
  Fajr: "5:15 AM",
  Dhuhr: "12:30 PM",
  Asr: "3:45 PM",
  Maghrib: "6:20 PM",
  Isha: "8:00 PM",
};

const PRAYER_ICONS: Record<PrayerName, string> = {
  Fajr: "sunrise",
  Dhuhr: "sun",
  Asr: "sunset",
  Maghrib: "moon",
  Isha: "star",
};

interface PrayerRowProps {
  name: PrayerName;
  completed: boolean;
  onToggle: () => void;
}

export function PrayerRow({ name, completed, onToggle }: PrayerRowProps) {
  const theme = useTheme();
  const checkScale = useSharedValue(1);

  const handlePress = () => {
    checkScale.value = withSequence(
      withSpring(0.8, { damping: 4 }),
      withSpring(1, { damping: 6 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Pressable onPress={handlePress} style={[styles.row, { backgroundColor: completed ? (theme.isDark ? theme.primaryLight : "#F0FBF5") : "transparent" }]}>
      <View style={styles.left}>
        <Feather name={PRAYER_ICONS[name] as any} size={18} color={completed ? theme.primary : theme.textTertiary} />
        <View style={styles.textGroup}>
          <Text style={[styles.name, { color: completed ? theme.primary : theme.text }]}>{name}</Text>
          <Text style={[styles.time, { color: theme.textTertiary }]}>{PRAYER_TIMES[name]}</Text>
        </View>
      </View>
      <Animated.View style={animatedStyle}>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: completed ? theme.primary : "transparent",
              borderColor: completed ? theme.primary : theme.border,
            },
          ]}
        >
          {completed && <Feather name="check" size={14} color="#FFFFFF" />}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textGroup: {
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
