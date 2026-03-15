import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareModal } from "@/components/ShareModal";
import { MindfulReminder } from "@/components/MindfulReminder";
import { StoriesRow } from "@/components/StoriesRow";
import { NotificationPanel } from "@/components/NotificationPanel";
import { usePosts } from "@/hooks/usePosts";
import type { PostWithUser } from "@/types/models";

const MINDFUL_THRESHOLD = 10;
type FeedItem =
  | { type: "post"; data: PostWithUser }
  | { type: "reminder"; id: string; reminderIndex: number };

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function SkeletonPulse({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

function SkeletonPostCard({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const skeletonBg = theme.isDark ? "#2A2A2A" : "#E5E5E5";
  return (
    <View style={[styles.skeletonCard, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
      <View style={styles.skeletonHeader}>
        <SkeletonPulse style={[styles.skeletonAvatar, { backgroundColor: skeletonBg }]} />
        <View style={styles.skeletonHeaderText}>
          <SkeletonPulse style={[styles.skeletonLine, { width: 120, height: 12, backgroundColor: skeletonBg }]} />
          <SkeletonPulse style={[styles.skeletonLine, { width: 60, height: 10, backgroundColor: skeletonBg, marginTop: 6 }]} />
        </View>
      </View>
      <SkeletonPulse style={[styles.skeletonMedia, { backgroundColor: skeletonBg }]} />
      <View style={styles.skeletonFooter}>
        <View style={styles.skeletonActions}>
          <SkeletonPulse style={[styles.skeletonIcon, { backgroundColor: skeletonBg }]} />
          <SkeletonPulse style={[styles.skeletonIcon, { backgroundColor: skeletonBg }]} />
          <SkeletonPulse style={[styles.skeletonIcon, { backgroundColor: skeletonBg }]} />
        </View>
        <SkeletonPulse style={[styles.skeletonLine, { width: 80, height: 11, backgroundColor: skeletonBg }]} />
        <SkeletonPulse style={[styles.skeletonLine, { width: "90%" as const, height: 11, backgroundColor: skeletonBg, marginTop: 8 }]} />
        <SkeletonPulse style={[styles.skeletonLine, { width: "60%" as const, height: 11, backgroundColor: skeletonBg, marginTop: 6 }]} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { toggleLike, likedPosts, username, currentUserId, avatarUri } = useApp();
  const { unreadCount } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const { data: posts, isLoading, isError, refetch, isRefetching } = usePosts();
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());

  const [dismissedReminders, setDismissedReminders] = useState(new Set<string>());
  const [postsScrolledPast, setPostsScrolledPast] = useState(0);
  const prevPostsRef = useRef<PostWithUser[] | undefined>(undefined);

  useEffect(() => {
    if (posts !== prevPostsRef.current) {
      prevPostsRef.current = posts;
      setPostsScrolledPast(0);
      setDismissedReminders(new Set());
    }
  }, [posts]);

  const handleScroll = useCallback((e: any) => {
    const offsetY: number = e.nativeEvent?.contentOffset?.y ?? 0;
    const HEADER_OFFSET = 200;
    const AVG_POST_HEIGHT = 440;
    const scrolledPastHeader = Math.max(0, offsetY - HEADER_OFFSET);
    const estimated = Math.floor(scrolledPastHeader / AVG_POST_HEIGHT) + 1;
    setPostsScrolledPast((prev) => Math.max(prev, estimated));
  }, []);

  const visiblePosts = useMemo(
    () => posts?.filter((p) => !hiddenPostIds.has(p.id)) ?? [],
    [posts, hiddenPostIds]
  );

  const feedData: FeedItem[] = useMemo(() => {
    if (!visiblePosts.length) return [];
    const items: FeedItem[] = [];
    let reminderIdx = 0;
    for (let i = 0; i < visiblePosts.length; i++) {
      items.push({ type: "post", data: visiblePosts[i] });
      const positionInFeed = i + 1;
      if (
        positionInFeed % MINDFUL_THRESHOLD === 0 &&
        postsScrolledPast >= positionInFeed
      ) {
        const reminderId = `reminder-${positionInFeed}`;
        if (!dismissedReminders.has(reminderId)) {
          items.push({ type: "reminder", id: reminderId, reminderIndex: reminderIdx });
        }
        reminderIdx++;
      }
    }
    return items;
  }, [visiblePosts, postsScrolledPast, dismissedReminders]);

  const handleDismissReminder = useCallback((id: string) => {
    setDismissedReminders((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  }, []);

  const activeCommentsPost = useMemo(
    () => visiblePosts.find((p) => p.id === commentsPostId) ?? null,
    [visiblePosts, commentsPostId]
  );

  const activeSharePost = useMemo(
    () => visiblePosts.find((p) => p.id === sharePostId) ?? null,
    [visiblePosts, sharePostId]
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
      <Text style={[styles.logo, { color: theme.primary }]}>Ummah</Text>
      <View style={styles.headerRight}>
        <Pressable
          hitSlop={12}
          style={styles.headerBtn}
          onPress={() => setPanelOpen(true)}
          testID="home-bell-btn"
        >
          <Feather name="bell" size={22} color={theme.icon} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable hitSlop={12} style={styles.headerBtn}>
          <Feather name="send" size={22} color={theme.icon} />
        </Pressable>
      </View>
    </View>
  );

  const renderLoading = () => (
    <View>
      <SkeletonPostCard theme={theme} />
      <SkeletonPostCard theme={theme} />
      <SkeletonPostCard theme={theme} />
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return renderLoading();
    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="wifi-off" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Could not load posts. Pull down to try again.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Feather name="inbox" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No posts yet. Be the first to share something.
        </Text>
      </View>
    );
  };

  const handleOpenComments = useCallback((postId: string) => {
    setCommentsPostId(postId);
  }, []);

  const handleOpenShare = useCallback((postId: string) => {
    setSharePostId(postId);
  }, []);

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === "reminder") {
      return (
        <MindfulReminder
          index={item.reminderIndex}
          onDismiss={() => handleDismissReminder(item.id)}
          testID={`mindful-reminder-${item.id}`}
        />
      );
    }
    return (
      <PostCard
        post={item.data}
        onLike={toggleLike}
        isLiked={likedPosts.has(item.data.id)}
        onComment={handleOpenComments}
        onShare={handleOpenShare}
        onHide={handleHidePost}
        testID={`post-${item.data.id}`}
      />
    );
  }, [toggleLike, likedPosts, handleOpenComments, handleOpenShare, handleHidePost, handleDismissReminder]);

  const keyExtractor = useCallback((item: FeedItem) => {
    return item.type === "reminder" ? item.id : item.data.id;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={feedData}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <StoriesRow />
          </>
        }
        ListEmptyComponent={renderEmpty}
        renderItem={renderFeedItem}
        onScroll={handleScroll}
        scrollEventThrottle={300}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 + 50 : 100 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={10}
        windowSize={11}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      />

      <CommentsSheet
        visible={!!commentsPostId}
        postId={commentsPostId ?? ""}
        onClose={() => setCommentsPostId(null)}
        currentUsername={username}
        currentUserId={currentUserId}
        avatarUrl={avatarUri}
        postOwnerUserId={activeCommentsPost?.user.id ?? null}
        postCaption={activeCommentsPost?.caption}
      />

      <ShareModal
        visible={!!sharePostId}
        postId={sharePostId ?? ""}
        postCaption={activeSharePost?.caption}
        currentUserId={currentUserId}
        onClose={() => setSharePostId(null)}
      />

      <NotificationPanel isVisible={panelOpen} onClose={() => setPanelOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  logo: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  headerBtn: {
    padding: 4,
    position: "relative" as const,
  },
  bellBadge: {
    position: "absolute" as const,
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 15,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  skeletonHeaderText: {
    marginLeft: 10,
  },
  skeletonLine: {
    borderRadius: 6,
  },
  skeletonMedia: {
    width: "100%" as const,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: 0,
  },
  skeletonFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  skeletonActions: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 10,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});
