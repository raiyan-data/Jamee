import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { reportPost } from "@/lib/data";

interface PostActionsMenuProps {
  visible: boolean;
  postId: string;
  postCaption?: string;
  isSaved: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onSave: () => void;
  onHide: () => void;
}

export function PostActionsMenu({
  visible,
  postId,
  postCaption,
  isSaved,
  currentUserId,
  onClose,
  onSave,
  onHide,
}: PostActionsMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const handleCopyLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = `https://ummah.app/post/${postId}`;
    await Clipboard.setStringAsync(link);
    onClose();
    Alert.alert("Link copied", "Post link copied to clipboard.");
  }, [postId, onClose]);

  const handleReport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    Alert.alert(
      "Report Post",
      "Why are you reporting this post?",
      [
        { text: "Spam", onPress: () => submitReport("spam") },
        { text: "Inappropriate content", onPress: () => submitReport("inappropriate") },
        { text: "Misinformation", onPress: () => submitReport("misinformation") },
        { text: "Hate speech", onPress: () => submitReport("hate_speech") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [onClose]);

  const submitReport = useCallback(async (reason: string) => {
    if (!currentUserId) return;
    await reportPost({ post_id: postId, user_id: currentUserId, reason });
    Alert.alert("Reported", "Thank you. We'll review this post.");
  }, [postId, currentUserId]);

  const handleHide = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onHide();
    onClose();
  }, [onHide, onClose]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave();
    onClose();
  }, [onSave, onClose]);

  const menuItems = [
    {
      icon: isSaved ? "bookmark" : "bookmark",
      label: isSaved ? "Remove from saved" : "Save post",
      color: isSaved ? theme.primary : theme.text,
      onPress: handleSave,
      testID: "menu-save",
    },
    {
      icon: "link",
      label: "Copy link",
      color: theme.text,
      onPress: handleCopyLink,
      testID: "menu-copy-link",
    },
    {
      icon: "eye-off",
      label: "Hide post",
      color: theme.text,
      onPress: handleHide,
      testID: "menu-hide",
    },
    {
      icon: "flag",
      label: "Report post",
      color: "#EF4444",
      onPress: handleReport,
      testID: "menu-report",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
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

          {postCaption ? (
            <Text style={[styles.caption, { color: theme.textSecondary }]} numberOfLines={2}>
              {postCaption}
            </Text>
          ) : null}

          {menuItems.map((item, idx) => (
            <Pressable
              key={item.testID}
              style={({ pressed }) => [
                styles.menuItem,
                { borderTopColor: theme.borderLight, borderTopWidth: idx === 0 ? 0 : 1 },
                pressed && { backgroundColor: theme.surfaceSecondary },
              ]}
              onPress={item.onPress}
              testID={item.testID}
            >
              <Feather name={item.icon as any} size={20} color={item.color} />
              <Text style={[styles.menuLabel, { color: item.color }]}>{item.label}</Text>
            </Pressable>
          ))}
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
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  caption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingBottom: 12,
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
