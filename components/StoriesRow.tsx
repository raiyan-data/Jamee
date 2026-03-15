import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Modal,
  TextInput,
  Animated,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";
import { useStories, useInvalidateStories } from "@/hooks/useStories";
import { StoryViewer } from "@/components/StoryViewer";
import type { StoryGroup } from "@/types/models";
import { getApiUrl } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

const TEXT_BG_PRESETS = [
  "#0D7C4A", "#C9A84C", "#1B4F72", "#512E5F",
  "#7D3C08", "#154360", "#1A5276", "#117A65",
];

async function uploadStoryImage(userId: string, localUri: string): Promise<string | null> {
  try {
    const ext = localUri.split(".").pop() ?? "jpg";
    const fileName = `stories/${userId}_${Date.now()}.${ext}`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
    if (error || !data) return null;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return urlData?.publicUrl ?? null;
  } catch {
    return null;
  }
}

interface AddStoryModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function AddStoryModal({ visible, onClose, onCreated }: AddStoryModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUserId, username, avatarUri } = useApp();
  const [caption, setCaption] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState(TEXT_BG_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to share images in stories.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleShare = async () => {
    if (!caption.trim() && !imageUri) return;
    if (!currentUserId) return;
    setIsSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType = "text";
      if (imageUri) {
        mediaUrl = await uploadStoryImage(currentUserId, imageUri);
        if (!mediaUrl) mediaUrl = imageUri;
        mediaType = "image";
      }
      const url = new URL("/api/stories", getApiUrl());
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          username,
          avatar_url: avatarUri || null,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption.trim(),
          story_type: "personal",
          bg_color: imageUri ? null : selectedBg,
        }),
      });
      setCaption("");
      setImageUri(null);
      setSelectedBg(TEXT_BG_PRESETS[0]);
      onCreated();
      onClose();
    } catch (e) {
      Alert.alert("Failed to share", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.addStoryContainer, { backgroundColor: imageUri ? "#000" : selectedBg }]}>
        {/* Preview area */}
        <View style={[styles.addStoryPreview, { paddingTop: topPad + 16 }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.addStoryImage} resizeMode="cover" />
          ) : (
            <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
              <Feather name="image" size={36} color="rgba(255,255,255,0.7)" />
              <Text style={styles.addImageBtnText}>Add Photo</Text>
            </Pressable>
          )}
          {imageUri && (
            <Pressable style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
              <Feather name="x" size={18} color="white" />
            </Pressable>
          )}
          {!imageUri && (
            <Text style={styles.captionPreview} numberOfLines={6}>
              {caption || "Your story text goes here..."}
            </Text>
          )}
        </View>

        {/* Controls */}
        <View style={[styles.addStoryControls, { backgroundColor: theme.background, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
          {!imageUri && (
            <View>
              <Text style={[styles.bgLabel, { color: theme.textSecondary }]}>Background</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={TEXT_BG_PRESETS}
                keyExtractor={(c) => c}
                contentContainerStyle={styles.bgColorList}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.bgColorDot, { backgroundColor: item }, selectedBg === item && styles.bgColorDotSelected]}
                    onPress={() => setSelectedBg(item)}
                  />
                )}
              />
            </View>
          )}
          <TextInput
            style={[styles.captionInput, { color: theme.text, borderColor: theme.borderLight, backgroundColor: theme.surface }]}
            placeholder="Add a caption..."
            placeholderTextColor={theme.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={280}
          />
          <View style={styles.addStoryFooter}>
            {!imageUri && (
              <Pressable style={[styles.pickImageSmall, { borderColor: theme.border }]} onPress={handlePickImage}>
                <Feather name="image" size={18} color={theme.icon} />
                <Text style={[styles.pickImageText, { color: theme.textSecondary }]}>Photo</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: theme.primary, opacity: (!caption.trim() && !imageUri) || isSubmitting ? 0.5 : 1 }]}
              onPress={handleShare}
              disabled={(!caption.trim() && !imageUri) || isSubmitting}
            >
              <Text style={styles.shareBtnText}>{isSubmitting ? "Sharing..." : "Share"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function StoriesRow() {
  const theme = useTheme();
  const { currentUserId } = useApp();
  const { data: groups = [], isLoading } = useStories();
  const invalidateStories = useInvalidateStories();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const [addStoryVisible, setAddStoryVisible] = useState(false);

  const myGroup = groups.find((g) => g.user_id === currentUserId);
  const otherGroups = groups.filter((g) => g.user_id !== currentUserId);
  const allGroups: StoryGroup[] = myGroup ? [myGroup, ...otherGroups] : otherGroups;

  const openViewer = (groupIndex: number) => {
    setViewerGroupIdx(groupIndex);
    setViewerVisible(true);
  };

  const openMyStory = () => {
    if (myGroup) {
      const idx = allGroups.findIndex((g) => g.user_id === currentUserId);
      if (idx >= 0) { openViewer(idx); return; }
    }
    setAddStoryVisible(true);
  };

  const renderStoryBubble = ({ item, index }: { item: StoryGroup; index: number }) => {
    const isMe = item.user_id === currentUserId;
    const groupIndexInAll = allGroups.findIndex((g) => g.user_id === item.user_id);
    const hasUnseen = item.has_unseen;

    return (
      <Pressable style={styles.storyItem} onPress={() => openViewer(groupIndexInAll)} testID={`story-bubble-${item.user_id}`}>
        <View style={[
          styles.storyRingOuter,
          hasUnseen
            ? { borderColor: theme.primary, borderWidth: 2.5 }
            : { borderColor: theme.isDark ? "#333" : "#CCC", borderWidth: 2 },
        ]}>
          <View style={[styles.storyRingInner, { backgroundColor: theme.background }]}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.storyAvatar} />
            ) : (
              <View style={[styles.storyAvatarFallback, { backgroundColor: theme.primary }]}>
                <Text style={styles.storyAvatarLetter}>{item.username[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
        {isMe && !myGroup && (
          <View style={[styles.addBadge, { backgroundColor: theme.primary }]}>
            <Feather name="plus" size={10} color="white" />
          </View>
        )}
        <Text style={[styles.storyLabel, { color: theme.textSecondary }]} numberOfLines={1}>
          {isMe ? "You" : item.username}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={otherGroups}
          keyExtractor={(g) => g.user_id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Pressable style={styles.storyItem} onPress={openMyStory} testID="add-story-btn">
              <View style={[styles.storyRingOuter, myGroup
                ? { borderColor: theme.primary, borderWidth: 2.5 }
                : { borderColor: theme.isDark ? "#333" : "#CCC", borderWidth: 2 }
              ]}>
                <View style={[styles.storyRingInner, { backgroundColor: theme.background }]}>
                  {myGroup?.avatar_url ? (
                    <Image source={{ uri: myGroup.avatar_url }} style={styles.storyAvatar} />
                  ) : (
                    <View style={[styles.storyAvatarFallback, { backgroundColor: theme.surfaceSecondary }]}>
                      <Feather name="plus" size={22} color={theme.textTertiary} />
                    </View>
                  )}
                </View>
              </View>
              {!myGroup && (
                <View style={[styles.addBadge, { backgroundColor: theme.primary }]}>
                  <Feather name="plus" size={10} color="white" />
                </View>
              )}
              <Text style={[styles.storyLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                Your Story
              </Text>
            </Pressable>
          }
          renderItem={({ item, index }) => {
            const groupIndexInAll = allGroups.findIndex((g) => g.user_id === item.user_id);
            const hasUnseen = item.has_unseen;
            return (
              <Pressable style={styles.storyItem} onPress={() => openViewer(groupIndexInAll)} testID={`story-bubble-${item.user_id}`}>
                <View style={[
                  styles.storyRingOuter,
                  hasUnseen
                    ? { borderColor: theme.primary, borderWidth: 2.5 }
                    : { borderColor: theme.isDark ? "#333" : "#CCC", borderWidth: 2 },
                ]}>
                  <View style={[styles.storyRingInner, { backgroundColor: theme.background }]}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatarFallback, { backgroundColor: theme.primary }]}>
                        <Text style={styles.storyAvatarLetter}>{item.username[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.storyLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.username}
                </Text>
              </Pressable>
            );
          }}
          scrollEnabled={!!otherGroups.length}
        />
      </View>

      <StoryViewer
        groups={allGroups}
        initialGroupIndex={viewerGroupIdx}
        visible={viewerVisible}
        onClose={() => { setViewerVisible(false); invalidateStories(); }}
        currentUserId={currentUserId ?? ""}
        onStoriesUpdated={invalidateStories}
      />

      <AddStoryModal
        visible={addStoryVisible}
        onClose={() => setAddStoryVisible(false)}
        onCreated={invalidateStories}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: "center",
    gap: 6,
    width: 70,
    position: "relative",
  },
  storyRingOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  storyAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarLetter: {
    color: "white",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  addBadge: {
    position: "absolute",
    bottom: 22,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "white",
  },
  storyLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  addStoryContainer: {
    flex: 1,
  },
  addStoryPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 24,
  },
  addStoryImage: {
    ...StyleSheet.absoluteFillObject,
  },
  addImageBtn: {
    alignItems: "center",
    gap: 12,
    padding: 32,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderStyle: "dashed",
  },
  addImageBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  removeImageBtn: {
    position: "absolute",
    top: 24,
    right: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    padding: 8,
  },
  captionPreview: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 30,
  },
  addStoryControls: {
    padding: 16,
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bgLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  bgColorList: {
    gap: 10,
    paddingBottom: 4,
  },
  bgColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bgColorDotSelected: {
    borderWidth: 3,
    borderColor: "white",
    transform: [{ scale: 1.15 }],
  },
  captionInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 60,
    maxHeight: 100,
  },
  addStoryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickImageSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickImageText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  shareBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  shareBtnText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
