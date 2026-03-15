import React, { useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, ActivityIndicator, RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { useNotifications } from "@/contexts/NotificationsContext";
import type { AppNotification, NotificationType } from "@/types/models";

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  return `${diffWeek}w ago`;
}

function getTimeGroup(dateStr: string): "Today" | "Yesterday" | "This Week" | "Earlier" {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay < 1) return "Today";
  if (diffDay < 2) return "Yesterday";
  if (diffDay < 7) return "This Week";
  return "Earlier";
}

function getTypeConfig(type: NotificationType): {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bgColor: string;
} {
  switch (type) {
    case "like":
      return { icon: "heart", color: "#EF4444", bgColor: "#EF444418" };
    case "comment":
      return { icon: "message-circle", color: "#3B82F6", bgColor: "#3B82F618" };
    case "follow":
      return { icon: "user-plus", color: "#0D7C4A", bgColor: "#0D7C4A18" };
    case "masjid_announcement":
      return { icon: "home", color: "#C9A84C", bgColor: "#C9A84C18" };
    default:
      return { icon: "bell", color: "#6B6B6B", bgColor: "#6B6B6B18" };
  }
}

function getNotificationText(n: AppNotification): string {
  const actor = n.actor_username ? `@${n.actor_username}` : "Someone";
  switch (n.type) {
    case "like":
      return `${actor} liked your post`;
    case "comment":
      return `${actor} commented on your post`;
    case "follow":
      return `${actor} started following you`;
    case "masjid_announcement":
      return n.message ?? "New announcement from your masjid";
    default:
      return n.message ?? "New notification";
  }
}

interface NotifItemProps {
  item: AppNotification;
  onPress: (id: string) => void;
}

function NotifItem({ item, onPress }: NotifItemProps) {
  const theme = useTheme();
  const cfg = getTypeConfig(item.type);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: !item.is_read ? theme.primary + "08" : theme.background,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      testID={`notif-item-${item.id}`}
    >
      <View style={styles.avatarArea}>
        {item.actor_avatar ? (
          <Image source={{ uri: item.actor_avatar }} style={styles.actorAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.actorAvatarFallback, { backgroundColor: cfg.bgColor }]}>
            <Text style={[styles.actorLetter, { color: cfg.color }]}>
              {item.actor_username ? item.actor_username[0].toUpperCase() : "?"}
            </Text>
          </View>
        )}
        <View style={[styles.typeIcon, { backgroundColor: cfg.bgColor, borderColor: theme.background }]}>
          <Feather name={cfg.icon} size={10} color={cfg.color} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
          {getNotificationText(item)}
        </Text>
        {item.post_caption ? (
          <Text style={[styles.subText, { color: theme.textTertiary }]} numberOfLines={1}>
            "{item.post_caption}"
          </Text>
        ) : null}
        <Text style={[styles.timeText, { color: theme.textTertiary }]}>
          {formatTimeAgo(item.created_at)}
        </Text>
      </View>

      {!item.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
      )}
    </Pressable>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.sectionCount, { backgroundColor: theme.primary + "18" }]}>
          <Text style={[styles.sectionCountText, { color: theme.primary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

type ListItem =
  | { kind: "header"; title: string; unreadInGroup: number }
  | { kind: "notif"; data: AppNotification };

export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const {
    notifications, unreadCount, isLoading, isLoadingMore,
    hasMore, refresh, loadMore, markRead, markAllRead,
  } = useNotifications();

  const handleMarkRead = useCallback((id: string) => {
    Haptics.selectionAsync();
    markRead(id);
  }, [markRead]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllRead();
  }, [markAllRead]);

  const listData = useMemo<ListItem[]>(() => {
    if (notifications.length === 0) return [];
    const grouped: Record<string, AppNotification[]> = {};
    const groupOrder: string[] = [];
    for (const n of notifications) {
      const group = getTimeGroup(n.created_at);
      if (!grouped[group]) {
        grouped[group] = [];
        groupOrder.push(group);
      }
      grouped[group].push(n);
    }

    const items: ListItem[] = [];
    for (const group of groupOrder) {
      const groupNotifs = grouped[group];
      const unreadInGroup = groupNotifs.filter((n) => !n.is_read).length;
      items.push({ kind: "header", title: group, unreadInGroup });
      for (const n of groupNotifs) {
        items.push({ kind: "notif", data: n });
      }
    }
    return items;
  }, [notifications]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      return <SectionHeader title={item.title} count={item.unreadInGroup} />;
    }
    return <NotifItem item={item.data} onPress={handleMarkRead} />;
  }, [handleMarkRead]);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.kind === "header") return `header-${item.title}`;
    return `notif-${item.data.id}`;
  }, []);

  const Footer = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const Empty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.primaryLight }]}>
          <Feather name="bell" size={30} color={theme.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Notifications from likes, comments, and followers will appear here
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={[styles.markAllBtn, { backgroundColor: theme.primaryLight }]}
            testID="mark-all-read-btn"
          >
            <Feather name="check-circle" size={14} color={theme.primary} />
            <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<Footer />}
          ListEmptyComponent={<Empty />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          testID="notifications-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  avatarArea: {
    position: "relative" as const,
    width: 46,
    height: 46,
    flexShrink: 0,
  },
  actorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  actorAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  actorLetter: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  typeIcon: {
    position: "absolute" as const,
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  subText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
