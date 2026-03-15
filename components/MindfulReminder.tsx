import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";

const REMINDERS = [
  {
    title: "Time for a Pause",
    body: "You have been scrolling for a while. Take a moment to reflect, make dhikr, or step away for fresh air.",
    icon: "pause-circle" as const,
  },
  {
    title: "Remember Allah",
    body: "SubhanAllah, Alhamdulillah, Allahu Akbar. A moment of remembrance is worth more than hours of distraction.",
    icon: "heart" as const,
  },
  {
    title: "Check In With Yourself",
    body: "How are you feeling? Consider whether this time could be spent on something that nourishes your soul.",
    icon: "sun" as const,
  },
  {
    title: "Stretch and Breathe",
    body: "Your body deserves care too. Look away from the screen, stretch, and take three deep breaths.",
    icon: "wind" as const,
  },
  {
    title: "A Gentle Reminder",
    body: "The best of affairs are those done in moderation. Balance your screen time with acts of worship and connection.",
    icon: "compass" as const,
  },
];

interface MindfulReminderProps {
  index: number;
  onDismiss: () => void;
  testID?: string;
}

export function MindfulReminder({ index, onDismiss, testID }: MindfulReminderProps) {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const reminder = REMINDERS[index % REMINDERS.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
      testID={testID}
    >
      <View style={[styles.card, { backgroundColor: theme.accent + "14", borderColor: theme.accent + "30" }]}>
        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.accent + "20" }]}>
            <Feather name={reminder.icon} size={20} color={theme.accent} />
          </View>
          <Pressable onPress={handleDismiss} hitSlop={12} style={styles.dismissBtn} testID="mindful-dismiss">
            <Feather name="x" size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{reminder.title}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{reminder.body}</Text>
        <Pressable
          onPress={handleDismiss}
          style={[styles.continueBtn, { backgroundColor: theme.accent + "18" }]}
        >
          <Text style={[styles.continueBtnText, { color: theme.accent }]}>Continue Scrolling</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissBtn: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 16,
  },
  continueBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  continueBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
