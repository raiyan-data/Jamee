import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Share,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { recordShare } from "@/lib/data";

interface ShareModalProps {
  visible: boolean;
  postId: string;
  postCaption?: string;
  currentUserId: string | null;
  onClose: () => void;
}

export function ShareModal({
  visible,
  postId,
  postCaption,
  currentUserId,
  onClose,
}: ShareModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [recipientInput, setRecipientInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const postLink = `https://ummah.app/post/${postId}`;

  const handleCopyLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(postLink);
    if (currentUserId) {
      recordShare({ post_id: postId, sender_id: currentUserId, share_type: "copy_link" });
    }
    onClose();
    Alert.alert("Link copied", "Post link copied to clipboard.");
  }, [postLink, postId, currentUserId, onClose]);

  const handleSystemShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: postCaption ? `${postCaption}\n\n${postLink}` : postLink,
        url: postLink,
      });
      if (currentUserId) {
        recordShare({ post_id: postId, sender_id: currentUserId, share_type: "system" });
      }
      onClose();
    } catch {
      // user cancelled
    }
  }, [postCaption, postLink, postId, currentUserId, onClose]);

  const handleSendToUser = useCallback(async () => {
    const recipient = recipientInput.trim();
    if (!recipient || !currentUserId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);
    try {
      await recordShare({
        post_id: postId,
        sender_id: currentUserId,
        share_type: "internal",
        recipient_id: recipient,
      });
      setSentTo(recipient);
      setRecipientInput("");
      setTimeout(() => {
        setSentTo(null);
        onClose();
      }, 1200);
    } finally {
      setIsSending(false);
    }
  }, [recipientInput, postId, currentUserId, onClose]);

  const handleClose = useCallback(() => {
    setRecipientInput("");
    setSentTo(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              paddingBottom: Math.max(insets.bottom, webBottomInset, 16),
            },
          ]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Share Post</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Feather name="x" size={22} color={theme.icon} />
            </Pressable>
          </View>

          {postCaption ? (
            <Text style={[styles.caption, { color: theme.textSecondary }]} numberOfLines={2}>
              {postCaption}
            </Text>
          ) : null}

          <View style={styles.sendRow}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderLight }]}>
              <Feather name="user" size={16} color={theme.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Send to username..."
                placeholderTextColor={theme.textTertiary}
                value={recipientInput}
                onChangeText={setRecipientInput}
                autoCapitalize="none"
                autoCorrect={false}
                testID="share-recipient-input"
              />
            </View>
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: theme.primary, opacity: recipientInput.trim() ? 1 : 0.4 },
              ]}
              onPress={handleSendToUser}
              disabled={!recipientInput.trim() || isSending}
              testID="share-send-btn"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : sentTo ? (
                <Feather name="check" size={18} color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>

          {sentTo ? (
            <Text style={[styles.sentLabel, { color: theme.primary }]}>
              Sent to @{sentTo}
            </Text>
          ) : null}

          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

          <Pressable
            style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.surfaceSecondary }]}
            onPress={handleCopyLink}
            testID="share-copy-link"
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.isDark ? "#2A2A2A" : "#F3F4F6" }]}>
              <Feather name="link" size={20} color={theme.text} />
            </View>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Copy link</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.surfaceSecondary }]}
            onPress={handleSystemShare}
            testID="share-system"
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.isDark ? "#2A2A2A" : "#F3F4F6" }]}>
              <Feather name="share-2" size={20} color={theme.text} />
            </View>
            <Text style={[styles.actionLabel, { color: theme.text }]}>Share via...</Text>
          </Pressable>
        </View>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  caption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingBottom: 12,
    lineHeight: 18,
  },
  sendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sentLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
