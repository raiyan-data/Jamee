import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { PrayerRow } from "@/components/PrayerRow";
import { PRAYER_NAMES } from "@/types/models";

export default function ProgressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { todayPrayers, togglePrayer, prayerStreak, quranProgress, updateQuranProgress } = useApp();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const completedPrayers = Object.values(todayPrayers).filter(Boolean).length;
  const prayerProgress = completedPrayers / PRAYER_NAMES.length;

  const quranPages = Math.round(quranProgress * 604);
  const quranJuz = Math.round(quranProgress * 30);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ paddingTop: insets.top + webTopInset + 8 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>Progress</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
              <ProgressRing
                progress={prayerProgress}
                size={90}
                strokeWidth={7}
                value={`${completedPrayers}/${PRAYER_NAMES.length}`}
                label="Prayers"
                color={theme.primary}
                testID="prayer-ring"
              />
            </View>
            <View style={styles.statsRight}>
              <View style={[styles.miniStatCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <View style={[styles.miniStatIcon, { backgroundColor: theme.accentLight }]}>
                  <Feather name="zap" size={16} color={theme.accent} />
                </View>
                <View>
                  <Text style={[styles.miniStatValue, { color: theme.text }]}>{prayerStreak}</Text>
                  <Text style={[styles.miniStatLabel, { color: theme.textTertiary }]}>Day Streak</Text>
                </View>
              </View>
              <View style={[styles.miniStatCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
                <View style={[styles.miniStatIcon, { backgroundColor: theme.primaryLight }]}>
                  <Feather name="book-open" size={16} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.miniStatValue, { color: theme.text }]}>Juz {quranJuz}</Text>
                  <Text style={[styles.miniStatLabel, { color: theme.textTertiary }]}>of 30</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Prayers</Text>
              <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  {completedPrayers}/{PRAYER_NAMES.length}
                </Text>
              </View>
            </View>
            {PRAYER_NAMES.map((prayer) => (
              <PrayerRow
                key={prayer}
                name={prayer}
                completed={!!todayPrayers[prayer]}
                onToggle={() => togglePrayer(prayer)}
              />
            ))}
          </View>

          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Quran Progress</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
                {quranPages} / 604 pages
              </Text>
            </View>
            <View style={styles.quranProgressArea}>
              <ProgressRing
                progress={quranProgress}
                size={120}
                strokeWidth={10}
                value={`${Math.round(quranProgress * 100)}%`}
                label="Complete"
                color={theme.accent}
                testID="quran-ring"
              />
            </View>
            <View style={styles.quranActions}>
              <Pressable
                onPress={() => {
                  updateQuranProgress(quranProgress + 1 / 604);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.quranBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                testID="add-page-btn"
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.quranBtnText}>Add Page</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  updateQuranProgress(quranProgress + 20 / 604);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  styles.quranBtn,
                  {
                    backgroundColor: theme.accent,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                testID="add-juz-btn"
              >
                <Feather name="bookmark" size={16} color="#FFFFFF" />
                <Text style={styles.quranBtnText}>Add Juz</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Overview</Text>
            <View style={styles.weekRow}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                const active = i < 5;
                return (
                  <View key={day} style={styles.dayCol}>
                    <View
                      style={[
                        styles.dayDot,
                        {
                          backgroundColor: active ? theme.primary : theme.borderLight,
                        },
                      ]}
                    >
                      {active && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.dayLabel, { color: theme.textTertiary }]}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRight: {
    flex: 1,
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStatValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  miniStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  quranProgressArea: {
    alignItems: "center",
    paddingVertical: 16,
  },
  quranActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  quranBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  quranBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  dayCol: {
    alignItems: "center",
    gap: 6,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
