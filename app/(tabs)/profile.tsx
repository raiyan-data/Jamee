import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Dimensions, Animated as RNAnimated, Modal, FlatList,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";
import { ProfileHeader, type Badge } from "@/components/ProfileHeader";
import { MasjidSelector } from "@/components/MasjidSelector";
import { joinMasjid } from "@/lib/data";
import { ProgressRing } from "@/components/ProgressRing";
import { getApiUrl } from "@/lib/query-client";
import type { Masjid } from "@/types/models";
import { usePosts } from "@/hooks/usePosts";

const { width } = Dimensions.get("window");
const GRID_COLS = 3;
const GRID_GAP = 2;
const GRID_SIZE = (width - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

const BADGE_DATA: Badge[] = [
  { icon: "zap", label: "7-Day Streak", color: "#F59E0B" },
  { icon: "book-open", label: "Quran Reader", color: "#0D7C4A" },
  { icon: "heart", label: "Kind Words", color: "#EF4444" },
  { icon: "star", label: "Active Member", color: "#8B5CF6" },
];

const GRID_COLORS = [
  "#1B5E3B", "#C9A84C", "#3B82F6",
  "#8B5CF6", "#EF4444", "#0D7C4A",
  "#F59E0B", "#6366F1", "#10B981",
];

const GRID_ICONS = [
  "bookmark", "heart", "star", "sun", "moon", "feather",
  "compass", "globe", "award",
] as const;

const TABS = ["Posts", "Saved", "Highlights", "Activity"] as const;
type TabKey = typeof TABS[number];

const ACTIVITY_ITEMS = [
  { icon: "heart" as const, color: "#EF4444", label: "Liked 23 posts", time: "Today" },
  { icon: "message-square" as const, color: "#3B82F6", label: "Left 5 comments", time: "Today" },
  { icon: "bookmark" as const, color: "#8B5CF6", label: "Saved 8 posts", time: "Yesterday" },
  { icon: "user-plus" as const, color: "#0D7C4A", label: "Followed 3 people", time: "Yesterday" },
  { icon: "share-2" as const, color: "#F59E0B", label: "Shared 2 posts", time: "This week" },
  { icon: "zap" as const, color: "#F59E0B", label: "Prayer streak: 7 days", time: "This week" },
];

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

function parseTimeToMs(timeStr: string, now: Date): number {
  const [h, m] = timeStr.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return target.getTime();
}

function EmptyTab({ icon, label, sub }: { icon: keyof typeof Feather.glyphMap; label: string; sub: string }) {
  const theme = useTheme();
  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.iconWrap, { backgroundColor: theme.primaryLight }]}>
        <Feather name={icon} size={28} color={theme.primary} />
      </View>
      <Text style={[emptyStyles.label, { color: theme.text }]}>{label}</Text>
      <Text style={[emptyStyles.sub, { color: theme.textSecondary }]}>{sub}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  label: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});

function WeeklyInsightsModal({
  visible,
  onClose,
  weekData,
}: {
  visible: boolean;
  onClose: () => void;
  weekData: Array<{ date: string; fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const last28Days = useMemo(() => {
    const days: { date: string; label: string; dayLabel: string; score: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const matched = weekData.find((w) => w.date.startsWith(dateStr));
      const score = matched
        ? [matched.fajr, matched.dhuhr, matched.asr, matched.maghrib, matched.isha].filter(Boolean).length
        : 0;
      const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      days.push({
        date: dateStr,
        label: `${d.getDate()}`,
        dayLabel: dayNames[d.getDay()],
        score,
      });
    }
    return days;
  }, [weekData]);

  const getColor = (score: number, isDark: boolean) => {
    if (score === 0) return isDark ? "#2A2A2A" : "#E5E7EB";
    if (score === 1) return "#94D5B0";
    if (score === 2) return "#4CAF82";
    if (score === 3) return "#2E9E68";
    if (score === 4) return "#1B7A4E";
    return "#0D7C4A";
  };

  const weekDayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const weeks: typeof last28Days[] = [];
  for (let i = 0; i < 4; i++) weeks.push(last28Days.slice(i * 7, (i + 1) * 7));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[
          wStyles.sheet,
          { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }
        ]}>
          <View style={wStyles.handleRow}><View style={[wStyles.handle, { backgroundColor: theme.border }]} /></View>
          <View style={wStyles.header}>
            <Text style={[wStyles.title, { color: theme.text }]}>Weekly Insights</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={[wStyles.sub, { color: theme.textSecondary }]}>Last 28 days — prayer completion heatmap</Text>

          <View style={wStyles.heatmapWrap}>
            <View style={wStyles.dayRow}>
              {weekDayLabels.map((d) => (
                <Text key={d} style={[wStyles.dayHeader, { color: theme.textTertiary }]}>{d}</Text>
              ))}
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} style={wStyles.weekRow}>
                {week.map((day) => (
                  <View
                    key={day.date}
                    style={[
                      wStyles.cell,
                      { backgroundColor: getColor(day.score, theme.isDark) },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={wStyles.legend}>
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <View key={s} style={wStyles.legendItem}>
                <View style={[wStyles.legendCell, { backgroundColor: getColor(s, theme.isDark) }]} />
                <Text style={[wStyles.legendLabel, { color: theme.textSecondary }]}>{s === 0 ? "None" : s === 5 ? "All 5" : `${s}/5`}</Text>
              </View>
            ))}
          </View>

          <View style={[wStyles.statsRow, { backgroundColor: theme.surfaceSecondary, borderRadius: 16 }]}>
            <View style={wStyles.statItem}>
              <Text style={[wStyles.statNum, { color: theme.text }]}>
                {last28Days.filter((d) => d.score === 5).length}
              </Text>
              <Text style={[wStyles.statLabel, { color: theme.textSecondary }]}>Perfect days</Text>
            </View>
            <View style={[wStyles.statDivider, { backgroundColor: theme.border }]} />
            <View style={wStyles.statItem}>
              <Text style={[wStyles.statNum, { color: theme.text }]}>
                {last28Days.filter((d) => d.score > 0).length}
              </Text>
              <Text style={[wStyles.statLabel, { color: theme.textSecondary }]}>Active days</Text>
            </View>
            <View style={[wStyles.statDivider, { backgroundColor: theme.border }]} />
            <View style={wStyles.statItem}>
              <Text style={[wStyles.statNum, { color: theme.text }]}>
                {Math.round(last28Days.reduce((sum, d) => sum + d.score, 0) / (28 * 5) * 100)}%
              </Text>
              <Text style={[wStyles.statLabel, { color: theme.textSecondary }]}>Avg rate</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const wStyles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  handleRow: { alignItems: "center", marginBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  heatmapWrap: { gap: 6, marginBottom: 16 },
  dayRow: { flexDirection: "row", justifyContent: "space-around" },
  dayHeader: { fontSize: 11, fontFamily: "Inter_500Medium", width: (width - 80) / 7, textAlign: "center" },
  weekRow: { flexDirection: "row", justifyContent: "space-around", gap: 4 },
  cell: { width: (width - 80) / 7 - 4, height: (width - 80) / 7 - 4, borderRadius: 4 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 1, marginHorizontal: 4 },
});

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    username, displayName, bio, avatarLetter, avatarUri,
    followers, following, posts: postCount, showFollowers,
    location, gender, ageGroup, prayerStreak,
    masjid, setMasjid, currentUserId, savedPosts, likedPosts,
    todayPrayers, quranProgress, sunnahHabits,
  } = useApp();
  const { data: allPosts } = usePosts();

  const [activeTab, setActiveTab] = useState<TabKey>("Posts");
  const [masjidSelectorVisible, setMasjidSelectorVisible] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [nextPrayer, setNextPrayer] = useState<string | null>(null);
  const tabIndicatorLeft = useRef(new RNAnimated.Value(0)).current;
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const completedPrayers = Object.values(todayPrayers).filter(Boolean).length;
  const prayerRingProgress = completedPrayers / 5;
  const completedSunnah = [sunnahHabits.morningAdhkar, sunnahHabits.eveningAdhkar, sunnahHabits.sunnahPrayer].filter(Boolean).length;
  const sunnahRingProgress = completedSunnah / 3;

  const cityFromLocation = useMemo(() => {
    if (!location) return { city: "Mecca", country: "SA" };
    const parts = location.split(",");
    return { city: parts[0].trim(), country: parts[1]?.trim() ?? "SA" };
  }, [location]);

  useEffect(() => {
    const loadWeekData = async () => {
      if (!currentUserId) return;
      try {
        const base = getApiUrl();
        const url = new URL(`/api/habits/${currentUserId}/month`, base);
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setWeekData(data.month ?? []);
        }
      } catch {}
    };
    loadWeekData();
  }, [currentUserId]);

  useEffect(() => {
    setPrayerLoading(true);
    const base = getApiUrl();
    const url = new URL("/api/prayer-times", base);
    url.searchParams.set("city", cityFromLocation.city);
    url.searchParams.set("country", cityFromLocation.country);
    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.timings) {
          const t = d.data.timings;
          setPrayerTimes({
            Fajr: t.Fajr?.slice(0, 5) ?? "",
            Dhuhr: t.Dhuhr?.slice(0, 5) ?? "",
            Asr: t.Asr?.slice(0, 5) ?? "",
            Maghrib: t.Maghrib?.slice(0, 5) ?? "",
            Isha: t.Isha?.slice(0, 5) ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setPrayerLoading(false));
  }, [cityFromLocation.city, cityFromLocation.country]);

  useEffect(() => {
    if (!prayerTimes) return;
    const tick = () => {
      const now = new Date();
      let found: string | null = null;
      let foundMs = 0;
      for (const p of PRAYER_ORDER) {
        const tMs = parseTimeToMs(prayerTimes[p], now);
        if (tMs > now.getTime()) {
          found = p;
          foundMs = tMs;
          break;
        }
      }
      if (!found) {
        const tomorrowFajr = parseTimeToMs(prayerTimes["Fajr"], now) + 86400000;
        found = "Fajr";
        foundMs = tomorrowFajr;
      }
      setNextPrayer(found);
      setCountdown(formatCountdown(foundMs - now.getTime()));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  const handleTabPress = useCallback((tab: TabKey, index: number) => {
    setActiveTab(tab);
    Haptics.selectionAsync();
    const tabWidth = (width - 32) / TABS.length;
    RNAnimated.timing(tabIndicatorLeft, {
      toValue: index * tabWidth,
      duration: 200,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [tabIndicatorLeft]);

  const handleMasjidSelect = useCallback(async (selected: Masjid | null) => {
    const prev = masjid;
    setMasjid(selected);
    try {
      if (currentUserId) await joinMasjid(currentUserId, selected?.id ?? null);
    } catch {
      setMasjid(prev);
    }
  }, [currentUserId, setMasjid, masjid]);

  const savedPostsList = allPosts?.filter((p) => savedPosts.has(p.id)) ?? [];

  const renderPostGrid = (count: number, isSaved = false) => (
    <View style={gridStyles.grid}>
      {count === 0 ? (
        <EmptyTab
          icon={isSaved ? "bookmark" : "grid"}
          label={isSaved ? "No saved posts" : "No posts yet"}
          sub={isSaved ? "Bookmark posts to save them here" : "Share your first post"}
        />
      ) : (
        Array.from({ length: count }).map((_, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              gridStyles.item,
              { backgroundColor: GRID_COLORS[i % GRID_COLORS.length] + (theme.isDark ? "60" : "30"), opacity: pressed ? 0.85 : 1 },
            ]}
            testID={`post-grid-${i}`}
          >
            <Feather name={GRID_ICONS[i % GRID_ICONS.length] as any} size={22} color={GRID_COLORS[i % GRID_COLORS.length]} />
          </Pressable>
        ))
      )}
    </View>
  );

  const renderHighlights = () => (
    <View style={hlStyles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={hlStyles.scroll}>
        {["Ramadan", "Hajj Journey", "Daily Adhkar", "Lectures"].map((title, i) => (
          <View key={i} style={hlStyles.item}>
            <View style={[hlStyles.circle, { borderColor: theme.primary + "40", backgroundColor: theme.primaryLight }]}>
              <Text style={[hlStyles.circleIcon, { color: theme.primary }]}>{["🌙", "🕋", "📿", "🎓"][i]}</Text>
            </View>
            <Text style={[hlStyles.label, { color: theme.textSecondary }]}>{title}</Text>
          </View>
        ))}
        <View style={hlStyles.item}>
          <View style={[hlStyles.circle, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
            <Feather name="plus" size={22} color={theme.textTertiary} />
          </View>
          <Text style={[hlStyles.label, { color: theme.textTertiary }]}>New</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderActivity = () => (
    <View style={actStyles.wrap}>
      {ACTIVITY_ITEMS.map((item, i) => (
        <View key={i} style={[actStyles.item, { borderBottomColor: theme.borderLight }]}>
          <View style={[actStyles.iconWrap, { backgroundColor: item.color + "15" }]}>
            <Feather name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={[actStyles.label, { color: theme.text }]}>{item.label}</Text>
          <Text style={[actStyles.time, { color: theme.textTertiary }]}>{item.time}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: insets.top + webTopInset + 8 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>@{username}</Text>
            <Pressable hitSlop={12} onPress={() => router.push("/settings")} testID="profile-settings-btn">
              <Feather name="settings" size={22} color={theme.icon} />
            </Pressable>
          </View>

          <ProfileHeader
            username={username}
            displayName={displayName || username}
            bio={bio}
            avatarLetter={avatarLetter}
            avatarImageUri={avatarUri || undefined}
            location={location}
            stats={{ posts: postCount, followers, following }}
            showFollowers={showFollowers}
            badges={BADGE_DATA}
            streak={prayerStreak}
            masjid={masjid}
            onMasjidPress={() => setMasjidSelectorVisible(true)}
            isOwnProfile
            onEditProfile={() => router.push("/edit-profile")}
            onShare={() => {}}
            onAvatarPress={() => router.push("/edit-profile")}
            testID="profile-header"
          />

          {/* ── SUNNAH RINGS ── */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="circle-multiple" size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Sunnah Rings</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowInsights(true);
                }}
                style={[styles.insightsBtn, { backgroundColor: theme.primaryLight }]}
                testID="weekly-insights-btn"
              >
                <Feather name="bar-chart-2" size={13} color={theme.primary} />
                <Text style={[styles.insightsBtnText, { color: theme.primary }]}>Weekly</Text>
              </Pressable>
            </View>

            <View style={styles.ringsRow}>
              <View style={styles.ringItem}>
                <ProgressRing
                  progress={prayerRingProgress}
                  size={78}
                  strokeWidth={7}
                  value={`${completedPrayers}/5`}
                  color="#0D7C4A"
                  testID="profile-prayer-ring"
                />
                <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>Prayers</Text>
              </View>
              <View style={styles.ringItem}>
                <ProgressRing
                  progress={quranProgress}
                  size={78}
                  strokeWidth={7}
                  value={`${Math.round(quranProgress * 100)}%`}
                  color="#C9A84C"
                  testID="profile-quran-ring"
                />
                <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>Quran</Text>
              </View>
              <View style={styles.ringItem}>
                <ProgressRing
                  progress={sunnahRingProgress}
                  size={78}
                  strokeWidth={7}
                  value={`${completedSunnah}/3`}
                  color="#6366F1"
                  testID="profile-sunnah-ring"
                />
                <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>Sunnah</Text>
              </View>
            </View>

            <View style={[styles.streakBadge, { backgroundColor: theme.accentLight }]}>
              <Feather name="zap" size={14} color={theme.accent} />
              <Text style={[styles.streakText, { color: theme.accent }]}>{prayerStreak}-day prayer streak</Text>
            </View>
          </View>

          {/* ── PRAYER TIMES ── */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Feather name="clock" size={16} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Prayer Times</Text>
              </View>
              <Text style={[styles.cityLabel, { color: theme.textSecondary }]}>
                {cityFromLocation.city}
              </Text>
            </View>

            {nextPrayer && countdown ? (
              <View style={[styles.countdownRow, { backgroundColor: theme.primaryLight }]}>
                <View>
                  <Text style={[styles.countdownLabel, { color: theme.primary }]}>Next: {nextPrayer}</Text>
                  <Text style={[styles.countdownTimer, { color: theme.primary }]}>{countdown}</Text>
                </View>
                <MaterialCommunityIcons name="hands-pray" size={22} color={theme.primary} />
              </View>
            ) : null}

            {prayerLoading ? (
              <View style={styles.prayerLoadingRow}>
                <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Loading prayer times...</Text>
              </View>
            ) : prayerTimes ? (
              PRAYER_ORDER.map((prayer) => {
                const isNext = prayer === nextPrayer;
                return (
                  <View
                    key={prayer}
                    style={[
                      styles.prayerRow,
                      { borderBottomColor: theme.borderLight },
                      isNext && { backgroundColor: theme.primaryLight + "60" },
                    ]}
                  >
                    <View style={styles.prayerLeft}>
                      {isNext && <View style={[styles.nextDot, { backgroundColor: theme.primary }]} />}
                      <Text style={[styles.prayerName, { color: isNext ? theme.primary : theme.text, fontFamily: isNext ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                        {prayer}
                      </Text>
                    </View>
                    <Text style={[styles.prayerTime, { color: isNext ? theme.primary : theme.textSecondary, fontFamily: isNext ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {prayerTimes[prayer]}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.prayerLoadingRow}>
                <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Set your city in settings to see accurate times</Text>
              </View>
            )}
          </View>

          {/* ── TABS ── */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            {TABS.map((tab, i) => (
              <Pressable
                key={tab}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab, i)}
                testID={`profile-tab-${tab.toLowerCase()}`}
              >
                <Text style={[styles.tabText, {
                  color: activeTab === tab ? theme.primary : theme.textSecondary,
                  fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                }]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
            <RNAnimated.View
              style={[styles.tabIndicator, { backgroundColor: theme.primary, left: tabIndicatorLeft, width: (width - 32) / TABS.length }]}
            />
          </View>

          <View style={styles.tabContent}>
            {activeTab === "Posts" && renderPostGrid(postCount > 0 ? Math.min(postCount, 9) : 0)}
            {activeTab === "Saved" && (
              savedPostsList.length > 0
                ? renderPostGrid(Math.min(savedPostsList.length, 9), true)
                : <EmptyTab icon="bookmark" label="No saved posts" sub="Bookmark posts to save them here" />
            )}
            {activeTab === "Highlights" && renderHighlights()}
            {activeTab === "Activity" && renderActivity()}
          </View>
        </View>
      </ScrollView>

      <MasjidSelector
        visible={masjidSelectorVisible}
        onClose={() => setMasjidSelectorVisible(false)}
        onSelect={handleMasjidSelect}
        currentMasjidId={masjid?.id}
      />

      <WeeklyInsightsModal
        visible={showInsights}
        onClose={() => setShowInsights(false)}
        weekData={weekData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  insightsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  insightsBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  ringItem: { alignItems: "center", gap: 8 },
  ringLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  streakText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cityLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  countdownLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  countdownTimer: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  prayerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    borderRadius: 8,
    paddingLeft: 8,
  },
  prayerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  nextDot: { width: 6, height: 6, borderRadius: 3 },
  prayerName: { fontSize: 14 },
  prayerTime: { fontSize: 14 },
  prayerLoadingRow: { paddingVertical: 16, alignItems: "center" },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderBottomWidth: 1,
    position: "relative",
    marginBottom: 0,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 13 },
  tabIndicator: { position: "absolute", bottom: 0, height: 2, borderRadius: 1 },
  tabContent: { minHeight: 200 },
});

const gridStyles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingTop: 12, gap: GRID_GAP },
  item: { width: GRID_SIZE, height: GRID_SIZE, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

const hlStyles = StyleSheet.create({
  wrap: { paddingTop: 16 },
  scroll: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
  item: { alignItems: "center", gap: 6, width: 70 },
  circle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  circleIcon: { fontSize: 24 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
});

const actStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
