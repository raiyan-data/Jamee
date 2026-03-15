import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { StoryGroup, Story } from "@/types/models";
import { formatTimeAgo } from "@/lib/data";
import { getApiUrl } from "@/lib/query-client";

const STORY_DURATION = 5000;
const { width: SW } = Dimensions.get("window");

const TEXT_BG_COLORS = ["#0D7C4A", "#1B4F72", "#512E5F", "#7D3C08", "#154360", "#1A5276"];

function getTextBg(story: Story): string {
  if (story.bg_color) return story.bg_color;
  const idx = story.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % TEXT_BG_COLORS.length;
  return TEXT_BG_COLORS[idx];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  onStoriesUpdated?: () => void;
}

export function StoryViewer({
  groups,
  initialGroupIndex,
  visible,
  onClose,
  currentUserId,
  onStoriesUpdated,
}: StoryViewerProps) {
  const insets = useSafeAreaInsets();
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef(progressAnim);
  const openAnim = useRef(new Animated.Value(0)).current;

  const groupIdxRef = useRef(groupIdx);
  const storyIdxRef = useRef(storyIdx);
  const groupsRef = useRef(groups);

  useEffect(() => { groupIdxRef.current = groupIdx; }, [groupIdx]);
  useEffect(() => { storyIdxRef.current = storyIdx; }, [storyIdx]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  const [ameenedSet, setAmeenedSet] = useState<Set<string>>(new Set());
  const [ameenCounts, setAmeenCounts] = useState<Record<string, number>>({});
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  useEffect(() => {
    if (!visible || !groups.length) return;
    const ameened = new Set<string>();
    const counts: Record<string, number> = {};
    for (const g of groups) {
      for (const s of g.stories) {
        if (s.has_ameened) ameened.add(s.id);
        counts[s.id] = s.ameen_count;
      }
    }
    setAmeenedSet(ameened);
    setAmeenCounts(counts);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setGroupIdx(initialGroupIndex);
    setStoryIdx(0);
  }, [initialGroupIndex, visible]);

  useEffect(() => {
    if (visible) {
      openAnim.setValue(0);
      Animated.spring(openAnim, {
        toValue: 1,
        tension: 120,
        friction: 14,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    progressAnimRef.current.stopAnimation();
    Animated.timing(openAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start(() => onClose());
  }, [onClose]);

  const handleCloseRef = useRef(handleClose);
  useEffect(() => { handleCloseRef.current = handleClose; }, [handleClose]);

  const goToNext = useCallback(() => {
    const gIdx = groupIdxRef.current;
    const sIdx = storyIdxRef.current;
    const g = groupsRef.current[gIdx];
    if (!g) { handleCloseRef.current(); return; }
    progressAnimRef.current.stopAnimation();
    if (sIdx < g.stories.length - 1) {
      setStoryIdx(sIdx + 1);
    } else if (gIdx < groupsRef.current.length - 1) {
      setGroupIdx(gIdx + 1);
      setStoryIdx(0);
    } else {
      handleCloseRef.current();
    }
  }, []);

  const goToPrev = useCallback(() => {
    const gIdx = groupIdxRef.current;
    const sIdx = storyIdxRef.current;
    progressAnimRef.current.stopAnimation();
    if (sIdx > 0) {
      setStoryIdx(sIdx - 1);
    } else if (gIdx > 0) {
      setGroupIdx(gIdx - 1);
      setStoryIdx(0);
    }
  }, []);

  const goToNextRef = useRef(goToNext);
  const goToPrevRef = useRef(goToPrev);
  useEffect(() => { goToNextRef.current = goToNext; }, [goToNext]);
  useEffect(() => { goToPrevRef.current = goToPrev; }, [goToPrev]);

  useEffect(() => {
    if (!visible || !story || paused) return;
    progressAnimRef.current.setValue(0);
    const anim = Animated.timing(progressAnimRef.current, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => { if (finished) goToNextRef.current(); });
    markViewed(story.id);
    return () => anim.stop();
  }, [visible, groupIdx, storyIdx, paused]);

  const markViewed = async (storyId: string) => {
    try {
      const url = new URL(`/api/stories/${storyId}/view`, getApiUrl());
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewer_id: currentUserId }),
      });
    } catch {}
  };

  const handleAmeen = async () => {
    if (!story) return;
    const sid = story.id;
    const wasAmeened = ameenedSet.has(sid);
    setAmeenedSet((prev) => {
      const next = new Set(prev);
      wasAmeened ? next.delete(sid) : next.add(sid);
      return next;
    });
    setAmeenCounts((prev) => ({
      ...prev,
      [sid]: Math.max(0, (prev[sid] ?? 0) + (wasAmeened ? -1 : 1)),
    }));
    try {
      const url = new URL(`/api/stories/${sid}/ameen`, getApiUrl());
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUserId }),
      });
      onStoriesUpdated?.();
    } catch {}
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {},
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) goToNextRef.current();
        else if (gs.dx > 50) goToPrevRef.current();
      },
    })
  ).current;

  if (!visible || !group || !story) return null;

  const isAmeened = ameenedSet.has(story.id);
  const ameenCount = ameenCounts[story.id] ?? story.ameen_count;
  const openScale = openAnim.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] });
  const openOpacity = openAnim;
  const progressWidth = progressAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const renderContent = () => {
    if (!story.media_url || story.media_type === "text") {
      return (
        <View style={[styles.textStory, { backgroundColor: getTextBg(story) }]}>
          {story.story_type === "reminder" && (
            <View style={styles.storyTypeBadge}>
              <Text style={styles.storyTypeText}>📿  Reminder</Text>
            </View>
          )}
          {story.story_type === "announcement" && (
            <View style={styles.storyTypeBadge}>
              <Text style={styles.storyTypeText}>📣  Announcement</Text>
            </View>
          )}
          <Text style={styles.textStoryCaption}>{story.caption}</Text>
        </View>
      );
    }
    if (story.media_type === "image") {
      return (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: story.media_url }}
            style={styles.storyImage}
            resizeMode="cover"
          />
          {!!story.caption && (
            <View style={styles.captionOverlay}>
              <Text style={styles.captionText}>{story.caption}</Text>
            </View>
          )}
        </View>
      );
    }
    return (
      <View style={[styles.textStory, { backgroundColor: "#111" }]}>
        <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
        {!!story.caption && <Text style={[styles.textStoryCaption, { marginTop: 20 }]}>{story.caption}</Text>}
      </View>
    );
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: openOpacity }]}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: openScale }] }]}
          {...panResponder.panHandlers}
        >
          {/* Progress bars */}
          <View style={[styles.progressRow, { marginTop: topPad }]}>
            {group.stories.map((_, idx) => (
              <View key={idx} style={styles.progressBarBg}>
                {idx < storyIdx ? (
                  <View style={[styles.progressBarFill, { width: "100%" }]} />
                ) : idx === storyIdx ? (
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth as any }]} />
                ) : null}
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={styles.storyHeader}>
            <View style={styles.userRow}>
              <View style={styles.headerAvatarWrap}>
                {group.avatar_url ? (
                  <Image
                    source={{ uri: group.avatar_url }}
                    style={{ width: 36, height: 36, borderRadius: 18 }}
                  />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <Text style={styles.headerAvatarLetter}>{group.username[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.headerUsername}>{group.username}</Text>
                <Text style={styles.headerTime}>{formatTimeAgo(story.created_at)}</Text>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={16} style={styles.closeBtn}>
              <Feather name="x" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {/* Content */}
          {renderContent()}

          {/* Tap navigation zones — behind footer */}
          <View style={[StyleSheet.absoluteFill, styles.tapZonesWrap]} pointerEvents="box-none">
            <Pressable
              style={styles.leftZone}
              onPress={goToPrev}
            />
            <Pressable
              style={styles.rightZone}
              onPress={goToNext}
            />
          </View>

          {/* Footer */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
              <View style={styles.footerRow}>
                {showReply ? (
                  <View style={styles.replyInputRow}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder={`Reply to ${group.username}...`}
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      value={replyText}
                      onChangeText={setReplyText}
                      autoFocus
                      onBlur={() => { setShowReply(false); setPaused(false); pausedRef.current = false; }}
                    />
                    <Pressable
                      style={styles.sendBtn}
                      onPress={() => { setReplyText(""); setShowReply(false); setPaused(false); }}
                    >
                      <Feather name="send" size={16} color="white" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.replyGhost}
                    onPress={() => { setPaused(true); pausedRef.current = true; progressAnimRef.current.stopAnimation(); setShowReply(true); }}
                  >
                    <Text style={styles.replyGhostText}>Reply...</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.ameenBtn, isAmeened && styles.ameenBtnActive]}
                  onPress={handleAmeen}
                  hitSlop={8}
                >
                  <Text style={styles.ameenArabicText}>آمين</Text>
                  <Text style={styles.ameenLatinText}>Ameen</Text>
                  {ameenCount > 0 && (
                    <Text style={styles.ameenCountText}>{ameenCount}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  container: {
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    gap: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 2,
  },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    zIndex: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    backgroundColor: "#0D7C4A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarLetter: {
    color: "white",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  headerUsername: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  headerTime: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  closeBtn: {
    padding: 4,
  },
  mediaContainer: {
    flex: 1,
    position: "relative",
  },
  storyImage: {
    flex: 1,
    width: "100%",
  },
  captionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  captionText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 24,
  },
  textStory: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  storyTypeBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  storyTypeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  textStoryCaption: {
    color: "white",
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 34,
  },
  tapZonesWrap: {
    flexDirection: "row",
    top: 100,
  },
  leftZone: {
    flex: 2,
    height: "100%",
  },
  rightZone: {
    flex: 3,
    height: "100%",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  replyGhost: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  replyGhostText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  replyInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    gap: 8,
  },
  replyInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    padding: 4,
  },
  ameenBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 72,
  },
  ameenBtnActive: {
    backgroundColor: "rgba(13,124,74,0.5)",
    borderColor: "#0D7C4A",
  },
  ameenArabicText: {
    color: "white",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  ameenLatinText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  ameenCountText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
});
