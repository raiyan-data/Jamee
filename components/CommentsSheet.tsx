import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { CommentItem, type CommentData } from "./CommentItem";
import { Avatar } from "./Avatar";
import { fetchComments, addComment, createNotification } from "@/lib/data";

interface CommentsSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  currentUsername: string;
  currentUserId?: string | null;
  avatarUrl?: string | null;
  postOwnerUserId?: string | null;
  postCaption?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

function backendToCommentData(c: {
  id: string; username: string; avatar_url: string | null;
  body: string; like_count: number; created_at: string;
}): CommentData {
  return {
    id: c.id,
    username: c.username,
    avatarLetter: c.username[0]?.toUpperCase() ?? "U",
    profilePicture: c.avatar_url,
    text: c.body,
    timeAgo: "now",
    likes: c.like_count,
    liked: false,
  };
}

export function CommentsSheet({
  visible,
  postId,
  onClose,
  currentUsername,
  currentUserId,
  avatarUrl,
  postOwnerUserId,
  postCaption,
}: CommentsSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && postId) {
      setIsLoading(true);
      setInputText("");
      let stale = false;
      fetchComments(postId).then((data) => {
        if (!stale) {
          setComments(
            data.map((c) => backendToCommentData(c))
          );
          setIsLoading(false);
        }
      });
      return () => { stale = true; };
    }
  }, [visible, postId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const tempId = `temp_${Date.now()}`;
    const optimistic: CommentData = {
      id: tempId,
      username: currentUsername || "you",
      avatarLetter: (currentUsername || "Y")[0].toUpperCase(),
      profilePicture: avatarUrl ?? null,
      text,
      timeAgo: "now",
      likes: 0,
      liked: false,
    };

    setComments((prev) => [optimistic, ...prev]);
    setInputText("");
    setIsSending(true);

    try {
      const saved = await addComment({
        post_id: postId,
        user_id: currentUserId ?? `anon_${Date.now()}`,
        username: currentUsername || "user",
        avatar_url: avatarUrl ?? null,
        body: text,
      });

      if (saved) {
        setComments((prev) =>
          prev.map((c) => c.id === tempId ? backendToCommentData(saved) : c)
        );
        if (postOwnerUserId && currentUserId && postOwnerUserId !== currentUserId) {
          createNotification({
            user_id: postOwnerUserId,
            type: "comment",
            actor_id: currentUserId,
            actor_username: currentUsername,
            actor_avatar: avatarUrl ?? null,
            post_id: postId,
            post_caption: postCaption,
          });
        }
      }
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, currentUsername, currentUserId, avatarUrl, postId, postOwnerUserId, postCaption]);

  const handleCommentLike = useCallback((_commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderComment = useCallback(({ item, index }: { item: CommentData; index: number }) => (
    <CommentItem
      comment={item}
      onLike={handleCommentLike}
      index={index}
      testID={`comment-${item.id}`}
    />
  ), [handleCommentLike]);

  const keyExtractor = useCallback((item: CommentData) => item.id, []);

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          <View style={[styles.sheetHeader, { borderBottomColor: theme.borderLight }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Comments</Text>
            <Text style={[styles.commentCount, { color: theme.textTertiary }]}>
              {comments.length}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Feather name="x" size={22} color={theme.icon} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={40} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No comments yet. Be the first to share your thoughts.
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={keyExtractor}
              renderItem={renderComment}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.borderLight,
                paddingBottom: Math.max(insets.bottom, webBottomInset, 12),
              },
            ]}
          >
            <Avatar
              letter={(currentUsername || "Y")[0].toUpperCase()}
              imageUri={avatarUrl ?? undefined}
              size={32}
              color={theme.primary}
            />
            <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderLight }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder="Add a comment..."
                placeholderTextColor={theme.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                testID="comment-input"
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              hitSlop={8}
              style={[styles.sendBtn, { opacity: inputText.trim() && !isSending ? 1 : 0.4 }]}
              testID="send-comment-btn"
            >
              {isSending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="send" size={20} color={theme.primary} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handle: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  commentCount: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginLeft: 8,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  commentsList: {
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    maxHeight: 100,
  },
  input: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    padding: 6,
  },
});
