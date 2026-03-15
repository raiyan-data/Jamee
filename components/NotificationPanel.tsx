import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { useNotifications } from "@/contexts/NotificationsContext";
import type { AppNotification, NotificationType } from "@/types/models";

const { width: SCREEN_W } = Dimensions.get("window");
const PANEL_WIDTH = Math.min(SCREEN_W * 0.88, 380);

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function getTimeGroup(dateStr: string): "Today" | "Yesterday" | "This Week" | "Earlier" {
  const diffDay = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDay < 1) return "Today";
  if (diffDay < 2) return "Yesterday";
  if (diffDay < 7) return "This Week";
  return "Earlier";
}

function getTypeConfig(type: NotificationType): { icon: keyof typeof Feather.glyphMap; color: string; bgColor: string } {
  switch (type) {
    case "like": return { icon: "heart", color: "#EF4444", bgColor: "#EF444418" };
    case "comment": return { icon: "message-circle", color: "#3B82F6", bgColor: "#3B82F618" };
    case "follow": return { icon: "user-plus", color: "#0D7C4A", bgColor: "#0D7C4A18" };
    case "masjid_announcement": return { icon: "home", color: "#C9A84C", bgColor: "#C9A84C18" };
    default: return { icon: "bell", color: "#6B6B6B", bgColor: "#6B6B6B18" };
  }
}

function getNotificationText(n: AppNotification): string {
  const actor = n.actor_username ? `@${n.actor_username}` : "Someone";
  switch (n.type) {
    case "like": return `${actor} liked your post`;
    case "comment": return `${actor} commented on your post`;
    case "follow": return `${actor} started following you`;
    case "masjid_announcement": return n.message ?? "New announcement from your masjid";
    default: return n.message ?? "New notification";
  }
}

function NotifItem({ item, onPress }: { item: AppNotification; onPress: (id: string) => void }) {
  const theme = useTheme();
  const cfg = getTypeConfig(item.type);
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        panelStyles.item,
        { backgroundColor: !item.is_read ? theme.primary + "08" : "transparent", opacity: pressed ? 0.8 : 1 },
      ]}
      testID={`panel-notif-${item.id}`}
    >
      <View style={panelStyles.avatarArea}>
        {item.actor_avatar ? (
          <Image source={{ uri: item.actor_avatar }} style={panelStyles.avatar} contentFit="cover" />
        ) : (
          <View style={[panelStyles.avatarFallback, { backgroundColor: cfg.bgColor }]}>
            <Text style={[panelStyles.avatarLetter, { color: cfg.color }]}>
              {item.actor_username ? item.actor_username[0].toUpperCase() : "?"}
            </Text>
          </View>
        )}
        <View style={[panelStyles.typeIcon, { backgroundColor: cfg.bgColor }]}>
          <Feather name={cfg.icon} size={9} color={cfg.color} />
        </View>
      </View>
      <View style={panelStyles.itemContent}>
        <Text style={[panelStyles.itemText, { color: theme.text }]} numberOfLines={2}>
          {getNotificationText(item)}
        </Text>
        {item.post_caption ? (
          <Text style={[panelStyles.itemSub, { color: theme.textTertiary }]} numberOfLines={1}>
            "{item.post_caption}"
          </Text>
        ) : null}
        <Text style={[panelStyles.itemTime, { color: theme.textTertiary }]}>
          {formatTimeAgo(item.created_at)}
        </Text>
      </View>
      {!item.is_read && <View style={[panelStyles.dot, { backgroundColor: theme.primary }]} />}
    </Pressable>
  );
}

function GroupHeader({ title, count }: { title: string; count: number }) {
  const theme = useTheme();
  return (
    <View style={[panelStyles.groupHeader, { backgroundColor: theme.surface }]}>
      <Text style={[panelStyles.groupTitle, { color: theme.textSecondary }]}>{title}</Text>
      {count > 0 && (
        <View style={[panelStyles.groupBadge, { backgroundColor: theme.primary + "18" }]}>
          <Text style={[panelStyles.groupBadgeText, { color: theme.primary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

type ListItem =
  | { kind: "header"; title: string; unread: number }
  | { kind: "notif"; data: AppNotification };

interface NotificationPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isVisible, onClose }: NotificationPanelProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === "web" ? 67 : 0;
  const { notifications, unreadCount, isLoading, isLoadingMore, hasMore, refresh, loadMore, markRead, markAllRead } = useNotifications();

  const slideX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, useNativeDriver: Platform.OS !== "web", tension: 80, friction: 12 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
      if (unreadCount > 0) {
        markAllRead();
      }
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: PANEL_WIDTH, duration: 220, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
    }
  }, [isVisible]);

  const listData = useMemo<ListItem[]>(() => {
    if (!notifications.length) return [];
    const grouped: Record<string, AppNotification[]> = {};
    const order: string[] = [];
    for (const n of notifications) {
      const g = getTimeGroup(n.created_at);
      if (!grouped[g]) { grouped[g] = []; order.push(g); }
      grouped[g].push(n);
    }
    const items: ListItem[] = [];
    for (const g of order) {
      items.push({ kind: "header", title: g, unread: grouped[g].filter((n) => !n.is_read).length });
      for (const n of grouped[g]) items.push({ kind: "notif", data: n });
    }
    return items;
  }, [notifications]);

  const handleMarkRead = useCallback((id: string) => {
    Haptics.selectionAsync();
    markRead(id);
  }, [markRead]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllRead();
  }, [markAllRead]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === "header") return <GroupHeader title={item.title} count={item.unread} />;
    return <NotifItem item={item.data} onPress={handleMarkRead} />;
  }, [handleMarkRead]);

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.kind === "header") return `ph-${item.title}`;
    return `pn-${item.data.id}`;
  }, []);

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={panelStyles.root} pointerEvents="box-none">
        <Animated.View
          style={[panelStyles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents={isVisible ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="panel-backdrop" />
        </Animated.View>

        <Animated.View
          style={[
            panelStyles.panel,
            {
              backgroundColor: theme.surface,
              width: PANEL_WIDTH,
              paddingTop: insets.top + webTop,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <View style={[panelStyles.panelHeader, { borderBottomColor: theme.borderLight }]}>
            <View style={panelStyles.panelTitleRow}>
              <Text style={[panelStyles.panelTitle, { color: theme.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={[panelStyles.unreadBadge, { backgroundColor: "#EF4444" }]}>
                  <Text style={panelStyles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={panelStyles.panelActions}>
              {unreadCount > 0 && (
                <Pressable
                  onPress={handleMarkAllRead}
                  style={[panelStyles.markAllBtn, { backgroundColor: theme.primaryLight }]}
                  testID="panel-mark-all-read"
                >
                  <Feather name="check-circle" size={13} color={theme.primary} />
                  <Text style={[panelStyles.markAllText, { color: theme.primary }]}>Mark all read</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={10} style={panelStyles.closeBtn} testID="panel-close">
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {isLoading && notifications.length === 0 ? (
            <View style={panelStyles.loading}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={listData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              contentContainerStyle={panelStyles.list}
              ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color={theme.primary} style={panelStyles.footer} /> : null}
              ListEmptyComponent={
                <View style={panelStyles.empty}>
                  <View style={[panelStyles.emptyIcon, { backgroundColor: theme.primaryLight }]}>
                    <Feather name="bell" size={26} color={theme.primary} />
                  </View>
                  <Text style={[panelStyles.emptyTitle, { color: theme.text }]}>All caught up</Text>
                  <Text style={[panelStyles.emptySub, { color: theme.textSecondary }]}>
                    Likes, comments, and follows will appear here
                  </Text>
                </View>
              }
              testID="panel-notif-list"
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const panelStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  panel: {
    flex: 1,
    maxWidth: PANEL_WIDTH,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  panelTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  panelActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  footer: {
    paddingVertical: 16,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  groupBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  groupBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarArea: {
    position: "relative" as const,
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  typeIcon: {
    position: "absolute" as const,
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  itemSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    fontStyle: "italic",
  },
  itemTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
});
