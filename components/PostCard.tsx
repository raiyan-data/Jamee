import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import { Avatar } from "./Avatar";
import { LikeButton } from "./LikeButton";
import { PostActionsMenu } from "./PostActionsMenu";
import type { PostWithUser } from "@/types/models";
import { formatTimeAgo, formatCount, avatarLetter, createNotification } from "@/lib/data";
import { useApp } from "@/contexts/AppContext";

const { width } = Dimensions.get("window");
const AVATAR_COLORS = ["#0D7C4A", "#C9A84C", "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B"];

interface PostCardProps {
  post: PostWithUser;
  onLike: (postId: string) => void;
  isLiked: boolean;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onProfilePress?: (userId: string) => void;
  onHide?: (postId: string) => void;
  testID?: string;
}

export function PostCard({
  post,
  onLike,
  isLiked,
  onComment,
  onShare,
  onBookmark,
  onProfilePress,
  onHide,
  testID,
}: PostCardProps) {
  const theme = useTheme();
  const { currentUserId, username, avatarUri, savedPosts, toggleSavePost } = useApp();
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikes, setLocalLikes] = useState(post.like_count);
  const [menuVisible, setMenuVisible] = useState(false);

  const isSaved = savedPosts.has(post.id);

  const colorIndex = post.user.username.charCodeAt(0) % AVATAR_COLORS.length;
  const letter = avatarLetter(post.user);
  const timeAgo = formatTimeAgo(post.created_at);

  const handleLikeToggle = useCallback(() => {
    const wasLiked = localLiked;
    setLocalLiked(!localLiked);
    setLocalLikes((prev) => (localLiked ? prev - 1 : prev + 1));
    onLike(post.id);
    if (!wasLiked && post.user.id !== currentUserId) {
      createNotification({
        user_id: post.user.id,
        type: "like",
        actor_id: currentUserId,
        actor_username: username,
        actor_avatar: avatarUri || null,
        post_id: post.id,
        post_caption: post.caption,
      });
    }
  }, [localLiked, post.id, post.user.id, post.caption, currentUserId, username, avatarUri, onLike]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSavePost(post.id);
    onBookmark?.(post.id);
  }, [post.id, toggleSavePost, onBookmark]);

  const handleComment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComment?.(post.id);
  }, [post.id, onComment]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare?.(post.id);
  }, [post.id, onShare]);

  const handleHide = useCallback(() => {
    onHide?.(post.id);
  }, [post.id, onHide]);

  const patternColors = [
    { bg: theme.isDark ? "#1A2F1A" : "#E8F5EE", fg: theme.isDark ? "#2ECC71" : "#0D7C4A" },
    { bg: theme.isDark ? "#2A2518" : "#FBF5E6", fg: theme.isDark ? "#D4AC5A" : "#C9A84C" },
    { bg: theme.isDark ? "#1A1A2F" : "#EEF0FF", fg: theme.isDark ? "#818CF8" : "#6366F1" },
    { bg: theme.isDark ? "#2A1A1A" : "#FEF2F2", fg: theme.isDark ? "#F87171" : "#EF4444" },
  ];
  const hashCode = post.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pattern = patternColors[hashCode % patternColors.length];
  const hasMedia = !!post.media_url;

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
      testID={testID}
    >
      <View style={styles.header}>
        <Avatar
          letter={letter}
          imageUri={post.user.profile_picture ?? undefined}
          size={36}
          color={AVATAR_COLORS[colorIndex]}
          onPress={() => onProfilePress?.(post.user_id)}
        />
        <Pressable
          style={styles.headerText}
          onPress={() => onProfilePress?.(post.user_id)}
        >
          <Text style={[styles.username, { color: theme.text }]}>{post.user.username}</Text>
          <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
        </Pressable>
        <Pressable
          hitSlop={12}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMenuVisible(true);
          }}
          testID={testID ? `${testID}-more` : undefined}
        >
          <Feather name="more-horizontal" size={20} color={theme.iconSecondary} />
        </Pressable>
      </View>

      {hasMedia ? (
        <Image
          source={{ uri: post.media_url! }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imageArea, { backgroundColor: pattern.bg }]}>
          <View style={styles.patternContainer}>
            <View style={[styles.patternCircle, { backgroundColor: pattern.fg, opacity: 0.08, top: 30, left: 20, width: 120, height: 120 }]} />
            <View style={[styles.patternCircle, { backgroundColor: pattern.fg, opacity: 0.05, top: 80, right: 40, width: 80, height: 80 }]} />
            <View style={[styles.patternCircle, { backgroundColor: pattern.fg, opacity: 0.06, bottom: 20, left: 60, width: 60, height: 60 }]} />
          </View>
          <View style={styles.quoteContainer}>
            <Feather name="bookmark" size={28} color={pattern.fg} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Text style={[styles.quoteText, { color: pattern.fg }]} numberOfLines={4}>
              {post.caption}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.actionGroup}>
          <LikeButton
            liked={localLiked}
            count={localLikes}
            onToggle={handleLikeToggle}
            size={22}
            testID={testID ? `${testID}-like` : undefined}
          />
          <Pressable
            style={styles.actionBtn}
            hitSlop={8}
            onPress={handleComment}
            testID={testID ? `${testID}-comment` : undefined}
          >
            <Feather name="message-circle" size={22} color={theme.iconSecondary} />
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            hitSlop={8}
            onPress={handleShare}
            testID={testID ? `${testID}-share` : undefined}
          >
            <Feather name="send" size={20} color={theme.iconSecondary} />
          </Pressable>
        </View>
        <Pressable
          hitSlop={12}
          onPress={handleBookmark}
          testID={testID ? `${testID}-bookmark` : undefined}
        >
          <Feather
            name={isSaved ? "bookmark" : "bookmark"}
            size={22}
            color={isSaved ? theme.primary : theme.iconSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.likeCount, { color: theme.text }]}>
          {formatCount(localLikes)} likes
        </Text>
        <View style={styles.captionArea}>
          <Text style={[styles.captionUser, { color: theme.text }]}>{post.user.username}</Text>
          <Text style={[styles.captionText, { color: theme.text }]} numberOfLines={3}>
            {" "}{post.caption}
          </Text>
        </View>
      </View>

      <PostActionsMenu
        visible={menuVisible}
        postId={post.id}
        postCaption={post.caption}
        isSaved={isSaved}
        currentUserId={currentUserId}
        onClose={() => setMenuVisible(false)}
        onSave={() => toggleSavePost(post.id)}
        onHide={handleHide}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  mediaImage: {
    width: "100%" as const,
    height: width * 0.75,
  },
  imageArea: {
    width: "100%" as const,
    height: width * 0.75,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  quoteContainer: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  quoteText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 24,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 6,
  },
  likeCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  captionArea: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  captionUser: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  captionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
});
