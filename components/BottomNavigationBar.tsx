import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";

export interface NavTab {
  name: string;
  icon: string;
  iconFocused: string;
  label: string;
  badge?: number;
}

interface BottomNavigationBarProps {
  tabs: NavTab[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
  testID?: string;
}

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 8, stiffness: 300 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={handlePress} style={styles.tabItem} testID={`tab-${tab.name}`}>
      <Animated.View style={[styles.tabItemInner, animatedStyle]}>
        <View style={styles.iconWrapper}>
          <Ionicons
            name={(isActive ? tab.iconFocused : tab.icon) as any}
            size={tab.name === "create" ? 26 : 22}
            color={isActive ? theme.tint : theme.tabIconDefault}
          />
          {tab.badge !== undefined && tab.badge > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.danger }]}>
              <Text style={styles.badgeText}>
                {tab.badge > 99 ? "99+" : `${tab.badge}`}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: isActive ? theme.tint : theme.tabIconDefault },
          ]}
        >
          {tab.label}
        </Text>
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function BottomNavigationBar({
  tabs,
  activeTab,
  onTabPress,
  testID,
}: BottomNavigationBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const webBottomInset = isWeb ? 34 : 0;
  const bottomPadding = isWeb ? webBottomInset : insets.bottom;

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPadding }]}
      testID={testID}
    >
      {isIOS ? (
        <BlurView
          intensity={100}
          tint={theme.isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.isDark ? "#0A0A0A" : "#FAFAF8",
            },
          ]}
        />
      )}

      {isWeb && (
        <View
          style={[
            styles.topBorder,
            {
              backgroundColor: theme.isDark ? "#2A2A2A" : "#EBEBEB",
            },
          ]}
        />
      )}

      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            isActive={activeTab === tab.name}
            onPress={() => onTabPress(tab.name)}
          />
        ))}
      </View>
    </View>
  );
}

export const DEFAULT_TABS: NavTab[] = [
  {
    name: "home",
    icon: "home-outline",
    iconFocused: "home",
    label: "Home",
  },
  {
    name: "explore",
    icon: "search-outline",
    iconFocused: "search",
    label: "Explore",
  },
  {
    name: "create",
    icon: "add-circle-outline",
    iconFocused: "add-circle",
    label: "Create",
  },
  {
    name: "progress",
    icon: "bar-chart-outline",
    iconFocused: "bar-chart",
    label: "Progress",
  },
  {
    name: "profile",
    icon: "person-outline",
    iconFocused: "person",
    label: "Profile",
  },
];

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabItemInner: {
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  iconWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
