import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { Avatar } from "./Avatar";
import { LikeButton } from "./LikeButton";
import { PostActionsMenu } from "./PostActionsMenu";
import type { Reel } from "@/types/models";
import { formatCount, avatarLetter } from "@/lib/data";
import { useApp } from "@/contexts/AppContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export type { Reel as ReelData };

interface VideoPlayerProps {
  reel: Reel;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string) => void;
  onShare?: (reelId: string) => void;
  onFollow?: (username: string) => void;
  isActive?: boolean;
  testID?: string;
}

export function VideoPlayer({
  reel,
  onLike,
  onComment,
  onShare,
  onFollow,
  isActive = true,
  testID,
}: VideoPlayerProps) {
  const insets = useSafeAreaInsets();
  const { currentUserId, savedPosts, toggleSavePost } = useApp();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.like_count);
  const [commentCount, setCommentCount] = useState(reel.comment_count);
  const [shareCount, setShareCount] = useState(reel.share_count);
  const [paused, setPaused] = useState(false);
  const [following, setFollowing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const isSaved = savedPosts.has(reel.id);

  const pauseIconOpacity = useSharedValue(0);
  const doubleTapScale = useSharedValue(0);
  const doubleTapOpacity = useSharedValue(0);

  const theme = useTheme();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!liked) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        onLike?.(reel.id);
      }
      doubleTapScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.2, { damping: 6, stiffness: 200 }),
        withDelay(400, withSpring(0, { damping: 10 }))
      );
      doubleTapOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(400, withTiming(0, { duration: 200 }))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPaused((prev) => !prev);
      pauseIconOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(600, withTiming(0, { duration: 300 }))
      );
    }
    lastTapRef.current = now;
  }, [liked, reel.id, onLike, doubleTapScale, doubleTapOpacity, pauseIconOpacity]);

  const handleLikeToggle = useCallback(() => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    onLike?.(reel.id);
  }, [liked, reel.id, onLike]);

  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComment?.(reel.id);
  }, [reel.id, onComment]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareCount((prev) => prev + 1);
    onShare?.(reel.id);
  }, [reel.id, onShare]);

  const handleFollow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowing((prev) => !prev);
    onFollow?.(reel.user.username);
  }, [reel.user.username, onFollow]);

  const pauseStyle = useAnimatedStyle(() => ({
    opacity: pauseIconOpacity.value,
  }));

  const doubleTapHeartStyle = useAnimatedStyle(() => ({
    opacity: doubleTapOpacity.value,
    transform: [{ scale: doubleTapScale.value }],
  }));

  const reelUsername = reel.user.username;
  const reelLetter = avatarLetter(reel.user);

  const patternDots = Array.from({ length: 6 }).map((_, i) => ({
    top: `${15 + i * 14}%`,
    left: `${10 + ((i * 37) % 80)}%`,
    size: 60 + (i * 23) % 80,
    opacity: 0.04 + (i * 0.01),
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: reel.color }]}
      testID={testID}
    >
      <View style={StyleSheet.absoluteFill}>
        {patternDots.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.bgDot,
              {
                top: dot.top as any,
                left: dot.left as any,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                opacity: dot.opacity,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.gradientOverlay, { top: 0, height: "30%" }]} />
      <View style={[styles.gradientOverlayBottom, { bottom: 0, height: "50%" }]} />

      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
        <View style={styles.centerContent}>
          <View style={styles.musicVisual}>
            {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.musicBar,
                  {
                    height: 40 * h,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    opacity: isActive && !paused ? 1 : 0.4,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </Pressable>

      <Animated.View style={[styles.pauseOverlay, pauseStyle]} pointerEvents="none">
        <Ionicons
          name={paused ? "pause" : "play"}
          size={64}
          color="rgba(255,255,255,0.7)"
        />
      </Animated.View>

      <Animated.View style={[styles.doubleTapHeart, doubleTapHeartStyle]} pointerEvents="none">
        <Ionicons name="heart" size={80} color="#EF4444" />
      </Animated.View>

      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + webTopInset + 8 },
        ]}
      >
        <Text style={styles.reelsTitle}>Reels</Text>
        <Pressable hitSlop={12}>
          <Feather name="camera" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <View
        style={[
          styles.bottomContent,
          { paddingBottom: insets.bottom + webBottomInset + 80 },
        ]}
      >
        <View style={styles.leftContent}>
          <View style={styles.userRow}>
            <Avatar letter={reelLetter} imageUri={reel.user.profile_picture ?? undefined} size={34} color="rgba(255,255,255,0.25)" />
            <Text style={styles.reelUsername}>{reelUsername}</Text>
            <Pressable
              onPress={handleFollow}
              style={[
                styles.followChip,
                following && styles.followingChip,
              ]}
            >
              <Text style={styles.followChipText}>
                {following ? "Following" : "Follow"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.caption} numberOfLines={2}>
            {reel.caption}
          </Text>
          <View style={styles.musicRow}>
            <Feather name="music" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.musicText}>Original Audio</Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          <View style={styles.actionItem}>
            <LikeButton
              liked={liked}
              count={likeCount}
              onToggle={handleLikeToggle}
              size={28}
              showCount={false}
              activeColor="#EF4444"
            />
            <Text style={styles.actionLabel}>{formatCount(likeCount)}</Text>
          </View>
          <Pressable
            style={styles.actionItem}
            onPress={handleComment}
            testID={testID ? `${testID}-comment` : undefined}
          >
            <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{formatCount(commentCount)}</Text>
          </Pressable>
          <Pressable
            style={styles.actionItem}
            onPress={handleShare}
            testID={testID ? `${testID}-share` : undefined}
          >
            <Feather name="send" size={24} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{formatCount(shareCount)}</Text>
          </Pressable>
          <Pressable
            style={styles.actionItem}
            hitSlop={10}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMenuVisible(true);
            }}
            testID={testID ? `${testID}-more` : undefined}
          >
            <Feather name="more-vertical" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <PostActionsMenu
        visible={menuVisible}
        postId={reel.id}
        postCaption={reel.caption}
        isSaved={isSaved}
        currentUserId={currentUserId}
        onClose={() => setMenuVisible(false)}
        onSave={() => toggleSavePost(reel.id)}
        onHide={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
  },
  bgDot: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,1)",
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  gradientOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  musicVisual: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 50,
  },
  musicBar: {
    width: 6,
    borderRadius: 3,
  },
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  doubleTapHeart: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  reelsTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
  leftContent: {
    flex: 1,
    gap: 10,
    paddingRight: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reelUsername: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  followChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  followingChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  followChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  caption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  musicText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  rightActions: {
    alignItems: "center",
    gap: 20,
  },
  actionItem: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
});
