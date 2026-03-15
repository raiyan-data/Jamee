import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/constants/theme";
import { Avatar } from "./Avatar";
import { LikeButton } from "./LikeButton";

export interface CommentData {
  id: string;
  username: string;
  avatarLetter: string;
  avatarColor?: string;
  profilePicture?: string | null;
  text: string;
  timeAgo: string;
  likes: number;
  liked: boolean;
  replies?: CommentData[];
}

interface CommentItemProps {
  comment: CommentData;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string) => void;
  isReply?: boolean;
  index?: number;
  testID?: string;
}

const AVATAR_COLORS = [
  "#0D7C4A",
  "#C9A84C",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#6366F1",
];

export function CommentItem({
  comment,
  onLike,
  onReply,
  isReply = false,
  index = 0,
  testID,
}: CommentItemProps) {
  const theme = useTheme();
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [showReplies, setShowReplies] = useState(false);

  const colorIdx =
    comment.avatarColor
      ? undefined
      : comment.username.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarColor =
    comment.avatarColor || AVATAR_COLORS[colorIdx as number];

  const handleLike = useCallback(() => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    onLike?.(comment.id);
  }, [liked, comment.id, onLike]);

  const handleReply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReply?.(comment.id);
  }, [comment.id, onReply]);

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 60).duration(300)}
      testID={testID}
    >
      <View style={[styles.container, isReply && styles.replyContainer]}>
        <Avatar
          letter={comment.avatarLetter}
          imageUri={comment.profilePicture ?? undefined}
          size={isReply ? 28 : 34}
          color={avatarColor}
        />
        <View style={styles.content}>
          <View style={styles.bubble}>
            <View style={styles.topRow}>
              <Text style={[styles.username, { color: theme.text }]}>
                {comment.username}
              </Text>
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>
                {comment.timeAgo}
              </Text>
            </View>
            <Text style={[styles.text, { color: theme.text }]}>
              {comment.text}
            </Text>
          </View>
          <View style={styles.actions}>
            <LikeButton
              liked={liked}
              count={likeCount}
              onToggle={handleLike}
              size={14}
              showCount={likeCount > 0}
            />
            <Pressable
              onPress={handleReply}
              hitSlop={10}
              style={styles.replyBtn}
            >
              <Feather
                name="corner-up-left"
                size={14}
                color={theme.textTertiary}
              />
              <Text style={[styles.replyText, { color: theme.textTertiary }]}>
                Reply
              </Text>
            </Pressable>
          </View>

          {hasReplies && !showReplies && (
            <Pressable
              onPress={() => setShowReplies(true)}
              style={styles.viewRepliesBtn}
            >
              <View
                style={[styles.repliesLine, { backgroundColor: theme.border }]}
              />
              <Text
                style={[styles.viewRepliesText, { color: theme.primary }]}
              >
                View {comment.replies!.length}{" "}
                {comment.replies!.length === 1 ? "reply" : "replies"}
              </Text>
            </Pressable>
          )}

          {hasReplies && showReplies && (
            <View style={styles.repliesContainer}>
              {comment.replies!.map((reply, i) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onLike={onLike}
                  onReply={onReply}
                  isReply
                  index={i}
                />
              ))}
              <Pressable
                onPress={() => setShowReplies(false)}
                style={styles.viewRepliesBtn}
              >
                <Text
                  style={[styles.viewRepliesText, { color: theme.textTertiary }]}
                >
                  Hide replies
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  replyContainer: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  content: {
    flex: 1,
  },
  bubble: {
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  username: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  text: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 6,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  viewRepliesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  repliesLine: {
    width: 24,
    height: 1,
  },
  viewRepliesText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  repliesContainer: {
    marginTop: 4,
  },
});
