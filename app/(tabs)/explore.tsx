import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Dimensions,
  ActivityIndicator,
  ViewToken,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareModal } from "@/components/ShareModal";
import { useVideoPosts } from "@/hooks/usePosts";
import { useApp } from "@/contexts/AppContext";
import type { PostWithUser } from "@/types/models";
import type { Reel } from "@/types/models";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const CATEGORIES = [
  { key: undefined as string | undefined, label: "All" },
  { key: "Quran", label: "Quran" },
  { key: "Reminders", label: "Reminders" },
  { key: "Lifestyle", label: "Lifestyle" },
  { key: "Learning", label: "Learning" },
  { key: "Masjid", label: "Masjid" },
];

const REEL_COLORS = ["#1B5E3B", "#0D4A2E", "#2D1B0E", "#1A3A5C", "#3B1F4A", "#4A2D1B"];

function postToReel(post: PostWithUser, index: number): Reel {
  return {
    id: post.id,
    user_id: post.user_id,
    media_url: post.media_url,
    caption: post.caption,
    like_count: post.like_count,
    comment_count: 0,
    share_count: 0,
    created_at: post.created_at,
    color: REEL_COLORS[index % REEL_COLORS.length],
    user: post.user,
  };
}

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUserId, username, avatarUri } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsReelId, setCommentsReelId] = useState<string | null>(null);
  const [shareReelId, setShareReelId] = useState<string | null>(null);

  const { data: videoPosts, isLoading, isError, refetch } = useVideoPosts(selectedCategory);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const reels = useMemo(() => {
    if (!videoPosts) return [];
    return videoPosts.map((post, i) => postToReel(post, i));
  }, [videoPosts]);

  const activeReel = useMemo(
    () => reels.find((r) => r.id === commentsReelId) ?? null,
    [reels, commentsReelId]
  );

  const activeShareReel = useMemo(
    () => reels.find((r) => r.id === shareReelId) ?? null,
    [reels, shareReelId]
  );

  const handleCategoryPress = useCallback((category: string | undefined) => {
    setSelectedCategory(category);
    setActiveIndex(0);
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleLike = useCallback((_reelId: string) => {}, []);

  const handleComment = useCallback((reelId: string) => {
    setCommentsReelId(reelId);
  }, []);

  const handleShare = useCallback((reelId: string) => {
    setShareReelId(reelId);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Reel; index: number }) => (
      <VideoPlayer
        reel={item}
        isActive={index === activeIndex}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        testID={`video-${item.id}`}
      />
    ),
    [activeIndex, handleLike, handleComment, handleShare]
  );

  const keyExtractor = useCallback((item: Reel) => item.id, []);

  const renderOverlay = () => (
    <View
      style={[styles.overlay, { paddingTop: insets.top + webTopInset + 8 }]}
      pointerEvents="box-none"
    >
      <Text style={styles.title}>Explore</Text>
      <View style={styles.filtersRow} pointerEvents="box-none">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.key;
            return (
              <Pressable
                onPress={() => handleCategoryPress(item.key)}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                testID={`filter-${item.label}`}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive ? styles.filterTextActive : styles.filterTextInactive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        {renderOverlay()}
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center]}>
        {renderOverlay()}
        <Feather name="wifi-off" size={48} color="rgba(255,255,255,0.5)" />
        <Text style={styles.errorText}>Could not load videos</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        {renderOverlay()}
        <Feather name="film" size={48} color="rgba(255,255,255,0.5)" />
        <Text style={styles.errorText}>No videos in this category</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
      {renderOverlay()}

      <CommentsSheet
        visible={!!commentsReelId}
        postId={commentsReelId ?? ""}
        onClose={() => setCommentsReelId(null)}
        currentUsername={username}
        currentUserId={currentUserId}
        avatarUrl={avatarUri}
        postOwnerUserId={activeReel?.user.id ?? null}
        postCaption={activeReel?.caption}
      />

      <ShareModal
        visible={!!shareReelId}
        postId={shareReelId ?? ""}
        postCaption={activeShareReel?.caption}
        currentUserId={currentUserId}
        onClose={() => setShareReelId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filtersRow: {
    flexDirection: "row",
  },
  filtersList: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  filterChipInactive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  filterTextActive: {
    color: "#000000",
  },
  filterTextInactive: {
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
