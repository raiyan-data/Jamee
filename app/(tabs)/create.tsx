import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { Avatar } from "@/components/Avatar";
import { createLocalPost, uploadMedia } from "@/lib/data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DARK = {
  bg: "#0A0A0A",
  surface: "#141414",
  surfaceElevated: "#1C1C1C",
  border: "#2A2A2A",
  borderGlow: "#064e3b40",
  primary: "#064e3b",
  primaryBright: "#0D7C4A",
  gold: "#d4af37",
  goldDim: "#d4af3740",
  text: "#F0F0F0",
  textSecondary: "#888888",
  textTertiary: "#555555",
};

const PLACEHOLDERS = [
  "Share a Verse that helped you today...",
  "What are you grateful for this morning?",
  "Share a Dua that's close to your heart...",
  "What did you learn from today's Salah?",
  "Share a reminder for the Ummah...",
  "Reflect on a moment of gratitude today...",
  "What Sunnah did you revive this week?",
  "Share something that increased your Iman...",
];

const QUICK_PHRASES = [
  { label: "Bismillah", value: "Bismillah" },
  { label: "Alhamdulillah", value: "Alhamdulillah" },
  { label: "SubhanAllah", value: "SubhanAllah" },
  { label: "Allahu Akbar", value: "Allahu Akbar" },
  { label: "ﷺ", value: "ﷺ" },
  { label: "Insha'Allah", value: "Insha'Allah" },
  { label: "Masha'Allah", value: "Masha'Allah" },
  { label: "JazakAllah Khair", value: "JazakAllah Khair" },
  { label: "Astaghfirullah", value: "Astaghfirullah" },
  { label: "Ameen", value: "Ameen" },
];

const AUDIENCE_OPTIONS = [
  { id: "public", label: "Public", icon: "earth" },
  { id: "sisters", label: "Sisters Only", icon: "account-heart" },
  { id: "brothers", label: "Brothers Only", icon: "account-group" },
  { id: "private", label: "Private", icon: "lock" },
] as const;

const QURAN_VERSES = [
  { surah: 2, ayah: 255, name: "Al-Baqarah", arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", translation: "Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. (Ayatul Kursi)" },
  { surah: 2, ayah: 286, name: "Al-Baqarah", arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", translation: "Allah does not burden a soul beyond that it can bear." },
  { surah: 3, ayah: 159, name: "Ali 'Imran", arabic: "فَتَوَكَّلْ عَلَى اللَّهِ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ", translation: "And rely upon Allah. Indeed, Allah loves those who rely upon Him." },
  { surah: 13, ayah: 28, name: "Ar-Ra'd", arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", translation: "Verily, in the remembrance of Allah do hearts find rest." },
  { surah: 94, ayah: 5, name: "Ash-Sharh", arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "For indeed, with hardship will be ease." },
  { surah: 94, ayah: 6, name: "Ash-Sharh", arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship will be ease." },
  { surah: 2, ayah: 153, name: "Al-Baqarah", arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Indeed, Allah is with the patient." },
  { surah: 65, ayah: 3, name: "At-Talaq", arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", translation: "And whoever relies upon Allah — then He is sufficient for him." },
  { surah: 9, ayah: 40, name: "At-Tawbah", arabic: "لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا", translation: "Do not grieve; indeed Allah is with us." },
  { surah: 39, ayah: 53, name: "Az-Zumar", arabic: "لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ", translation: "Do not despair of the mercy of Allah." },
  { surah: 2, ayah: 45, name: "Al-Baqarah", arabic: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", translation: "And seek help through patience and prayer." },
  { surah: 17, ayah: 9, name: "Al-Isra", arabic: "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ", translation: "Indeed, this Qur'an guides to that which is most suitable." },
  { surah: 55, ayah: 13, name: "Ar-Rahman", arabic: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", translation: "So which of the favors of your Lord would you deny?" },
  { surah: 6, ayah: 162, name: "Al-An'am", arabic: "إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ", translation: "Indeed, my prayer, my rites of sacrifice, my living and my dying are for Allah." },
  { surah: 20, ayah: 114, name: "Ta-Ha", arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا", translation: "And say: My Lord, increase me in knowledge." },
];

function VersePickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (verse: typeof QURAN_VERSES[number]) => void;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return QURAN_VERSES;
    const q = search.toLowerCase();
    return QURAN_VERSES.filter(
      (v) =>
        v.translation.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        String(v.surah).includes(q)
    );
  }, [search]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={vStyles.overlay}>
        <Pressable style={vStyles.backdrop} onPress={onClose} />
        <View
          style={[
            vStyles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={vStyles.handleRow}>
            <View style={vStyles.handle} />
          </View>
          <View style={vStyles.header}>
            <Text style={vStyles.title}>Quran Verses</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={DARK.textSecondary} />
            </Pressable>
          </View>

          <View style={vStyles.searchRow}>
            <Feather name="search" size={16} color={DARK.textTertiary} style={vStyles.searchIcon} />
            <TextInput
              style={vStyles.searchInput}
              placeholder="Search by Surah or keyword..."
              placeholderTextColor={DARK.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.surah}:${item.ayah}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  vStyles.verseItem,
                  pressed && { backgroundColor: DARK.primary + "30" },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(item);
                  setSearch("");
                  onClose();
                }}
              >
                <View style={vStyles.verseRef}>
                  <Text style={vStyles.verseRefText}>{item.name} {item.surah}:{item.ayah}</Text>
                </View>
                <Text style={vStyles.verseArabic} numberOfLines={2}>{item.arabic}</Text>
                <Text style={vStyles.verseTranslation} numberOfLines={3}>{item.translation}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={[vStyles.sep, { backgroundColor: DARK.border }]} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const vStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: DARK.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  handleRow: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: DARK.border },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: DARK.text },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: DARK.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: DARK.text,
    padding: 0,
    margin: 0,
  },
  verseItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 6,
  },
  verseRef: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: DARK.primary + "40",
    borderWidth: 1,
    borderColor: DARK.primary,
  },
  verseRefText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: DARK.gold },
  verseArabic: { fontSize: 16, fontFamily: "Inter_500Medium", color: DARK.text, textAlign: "right", lineHeight: 26 },
  verseTranslation: { fontSize: 12, fontFamily: "Inter_400Regular", color: DARK.textSecondary, lineHeight: 18 },
  sep: { height: 1, marginHorizontal: 16 },
});

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { avatarUri, username, currentUserId } = useApp();
  const queryClient = useQueryClient();

  const [caption, setCaption] = useState("");
  const [isDuaMode, setIsDuaMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [audience, setAudience] = useState<"public" | "sisters" | "brothers" | "private">("public");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [posted, setPosted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; mimeType: string } | null>(null);
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  const zenAnim = useRef(new Animated.Value(0)).current;
  const duaAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    Animated.timing(zenAnim, {
      toValue: isZenMode ? 1 : 0,
      duration: 350,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [isZenMode, zenAnim]);

  useEffect(() => {
    Animated.spring(duaAnim, {
      toValue: isDuaMode ? 1 : 0,
      damping: 14,
      stiffness: 120,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [isDuaMode, duaAnim]);

  const bgOpacity = zenAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] });

  const handleFocus = useCallback(() => setIsZenMode(true), []);
  const handleBlur = useCallback(() => setIsZenMode(false), []);

  const handleInsertPhrase = useCallback(
    (phrase: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCaption((prev) => (prev ? `${prev} ${phrase}` : phrase));
    },
    []
  );

  const handleVerseSelect = useCallback(
    (verse: typeof QURAN_VERSES[number]) => {
      const citation = `\n\n"${verse.arabic}"\n\n${verse.translation}\n\n— Surah ${verse.name} (${verse.surah}:${verse.ayah})`;
      setCaption((prev) => prev + citation);
    },
    []
  );

  const handlePickPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to your photo library to add images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open photo library.");
    }
  }, []);

  const handlePost = useCallback(async () => {
    if (!caption.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (selectedMedia) {
        mediaUrl = await uploadMedia(selectedMedia.uri, selectedMedia.mimeType);
      }
      await createLocalPost({
        user_id: currentUserId ?? "local_user",
        username: username ?? "you",
        avatar_url: avatarUri || null,
        caption: caption.trim(),
        media_url: mediaUrl,
        audience,
        is_dua: isDuaMode,
      });
      queryClient.invalidateQueries({ queryKey: ["/posts"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPosted(true);
      Animated.sequence([
        Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }),
        Animated.delay(1800),
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== "web" }),
      ]).start(() => {
        setCaption("");
        setIsDuaMode(false);
        setSelectedMedia(null);
        setPosted(false);
        setAudience("public");
      });
    } catch {
      Alert.alert("Error", "Could not share your post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [caption, isSubmitting, selectedMedia, currentUserId, username, avatarUri, audience, isDuaMode, successAnim, queryClient]);

  const handleDuaToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDuaMode((prev) => !prev);
  }, []);

  const avatarLetter = username?.[0]?.toUpperCase() ?? "U";

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 8,
          paddingBottom: Math.max(insets.bottom, 34) + 80,
        }}
      >
        {/* Header */}
        <Animated.View style={[styles.headerRow, { opacity: bgOpacity }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Create</Text>
            <Pressable
              onPress={() => setShowGuidelines(!showGuidelines)}
              hitSlop={12}
              style={styles.infoBtn}
            >
              <Feather name="info" size={16} color={DARK.gold} />
            </Pressable>
          </View>
          <Pressable
            onPress={handlePost}
            disabled={!caption.trim() || isSubmitting}
            style={({ pressed }) => [
              styles.postBtn,
              {
                backgroundColor: caption.trim() ? DARK.primaryBright : DARK.surfaceElevated,
                opacity: pressed ? 0.85 : 1,
                borderColor: caption.trim() ? DARK.primaryBright : DARK.border,
              },
            ]}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={[styles.postBtnText, { color: caption.trim() ? "#FFFFFF" : DARK.textTertiary }]}>Share</Text>
            }
          </Pressable>
        </Animated.View>

        {/* Success Banner */}
        <Animated.View style={[styles.successBanner, { opacity: successAnim }]} pointerEvents="none">
          <LinearGradient
            colors={["#064e3b", "#0D7C4A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.successGradient}
          >
            <Feather name="check-circle" size={18} color="#FFF" />
            <Text style={styles.successText}>Shared with the Ummah</Text>
          </LinearGradient>
        </Animated.View>

        {/* Collapsible Guidelines */}
        {showGuidelines && (
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelinesHeader}>
              <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
              <Pressable onPress={() => setShowGuidelines(false)} hitSlop={12}>
                <Feather name="x" size={16} color={DARK.textSecondary} />
              </Pressable>
            </View>
            {[
              "Share content that benefits the Ummah",
              "Be respectful and kind in your words",
              "Cite sources when sharing Islamic knowledge",
              "Avoid content that promotes division",
            ].map((tip, i) => (
              <View key={i} style={styles.guidelineRow}>
                <View style={[styles.guidelineDot, { backgroundColor: DARK.gold }]} />
                <Text style={styles.guidelineText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Composer */}
        <View style={styles.composerWrapper}>
          {isDuaMode ? (
            <LinearGradient
              colors={["#064e3b", "#0a3f2f", "#0f1f19"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.duaGradient}
            >
              <View style={styles.duaBadge}>
                <MaterialCommunityIcons name="hands-pray" size={14} color={DARK.gold} />
                <Text style={styles.duaBadgeText}>Dua Mode</Text>
              </View>
              <View style={styles.composerHeader}>
                <Avatar
                  letter={avatarLetter}
                  imageUri={avatarUri ?? undefined}
                  size={36}
                  color={DARK.primaryBright}
                />
                <Text style={styles.composerUsername}>{username}</Text>
              </View>
              <TextInput
                ref={inputRef}
                style={[styles.composerInput, styles.duaInput]}
                placeholder={placeholder}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={caption}
                onChangeText={setCaption}
                onFocus={handleFocus}
                onBlur={handleBlur}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCountDua}>{caption.length}/500</Text>
            </LinearGradient>
          ) : (
            <View style={styles.composerCard}>
              <View style={styles.composerHeader}>
                <Avatar
                  letter={avatarLetter}
                  imageUri={avatarUri ?? undefined}
                  size={36}
                  color={DARK.primaryBright}
                />
                <Text style={styles.composerUsername}>{username}</Text>
                {isZenMode && (
                  <View style={styles.zenBadge}>
                    <Text style={styles.zenBadgeText}>Zen Mode</Text>
                  </View>
                )}
              </View>
              <TextInput
                ref={inputRef}
                style={styles.composerInput}
                placeholder={placeholder}
                placeholderTextColor={DARK.textTertiary}
                value={caption}
                onChangeText={setCaption}
                onFocus={handleFocus}
                onBlur={handleBlur}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <View style={[styles.composerFooter, { borderTopColor: DARK.border }]}>
                <Text style={styles.charCount}>{caption.length}/500</Text>
              </View>
            </View>
          )}
        </View>

        {/* Image Preview */}
        {selectedMedia && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: selectedMedia.uri }}
              style={styles.imagePreview}
              contentFit="cover"
            />
            <Pressable
              style={styles.removeImageBtn}
              onPress={() => setSelectedMedia(null)}
              hitSlop={8}
            >
              <Feather name="x" size={14} color="#FFF" />
            </Pressable>
          </View>
        )}

        {/* Action Bar */}
        <Animated.View style={[styles.actionBar, { opacity: bgOpacity }]}>
          <Pressable
            style={[styles.actionBtn, !!selectedMedia && styles.actionBtnActive]}
            hitSlop={10}
            onPress={handlePickPhoto}
          >
            <Feather name="image" size={20} color={selectedMedia ? DARK.primaryBright : DARK.textSecondary} />
            <Text style={[styles.actionLabel, selectedMedia && { color: DARK.primaryBright }]}>Photo</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            hitSlop={10}
            onPress={() => Alert.alert("Coming Soon", "Video upload is coming soon.")}
          >
            <Feather name="video" size={20} color={DARK.textSecondary} />
            <Text style={styles.actionLabel}>Video</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, isDuaMode && styles.actionBtnActive]}
            hitSlop={10}
            onPress={handleDuaToggle}
          >
            <MaterialCommunityIcons
              name="hands-pray"
              size={20}
              color={isDuaMode ? DARK.gold : DARK.textSecondary}
            />
            <Text style={[styles.actionLabel, isDuaMode && { color: DARK.gold }]}>Dua</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            hitSlop={10}
            onPress={() => setShowVersePicker(true)}
          >
            <MaterialCommunityIcons name="book-open-variant" size={20} color={DARK.textSecondary} />
            <Text style={styles.actionLabel}>Verse</Text>
          </Pressable>
        </Animated.View>

        {/* Islamic Shortcuts */}
        <Animated.View style={[{ opacity: bgOpacity }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shortcutsScroll}
          >
            {QUICK_PHRASES.map((phrase) => (
              <Pressable
                key={phrase.value}
                style={({ pressed }) => [
                  styles.shortcutChip,
                  pressed && { backgroundColor: DARK.primary + "50" },
                ]}
                onPress={() => handleInsertPhrase(phrase.value)}
              >
                <Text style={styles.shortcutText}>{phrase.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Audience Selector */}
        <Animated.View style={[styles.audienceSection, { opacity: bgOpacity }]}>
          <Text style={styles.audienceLabel}>Audience</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.audienceScroll}
          >
            {AUDIENCE_OPTIONS.map((opt) => {
              const isActive = audience === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAudience(opt.id);
                  }}
                  style={[
                    styles.audienceChip,
                    isActive && {
                      backgroundColor: DARK.primary + "30",
                      borderColor: DARK.primaryBright,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={14}
                    color={isActive ? DARK.primaryBright : DARK.textSecondary}
                  />
                  <Text
                    style={[
                      styles.audienceChipText,
                      isActive && { color: DARK.primaryBright },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      <VersePickerModal
        visible={showVersePicker}
        onClose={() => setShowVersePicker(false)}
        onSelect={handleVerseSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    color: DARK.text,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DARK.goldDim,
    alignItems: "center",
    justifyContent: "center",
  },
  postBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },
  postBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  successBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  successGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  guidelinesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: DARK.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.borderGlow,
    padding: 16,
    gap: 10,
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: DARK.gold,
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  guidelineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
  },
  guidelineText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: DARK.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  composerWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  composerCard: {
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.border,
    borderRadius: 20,
    overflow: "hidden",
  },
  duaGradient: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: DARK.primary,
  },
  duaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: DARK.gold + "60",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 14,
  },
  duaBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: DARK.gold,
  },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  composerUsername: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: DARK.text,
    flex: 1,
  },
  zenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: DARK.primaryBright + "20",
    borderWidth: 1,
    borderColor: DARK.primaryBright + "40",
  },
  zenBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: DARK.primaryBright,
  },
  composerInput: {
    minHeight: 160,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
    color: DARK.text,
  },
  duaInput: {
    minHeight: 150,
    paddingHorizontal: 0,
    paddingTop: 0,
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
  },
  composerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: DARK.textTertiary,
  },
  charCountDua: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
    marginTop: 8,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: DARK.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.border,
    paddingVertical: 14,
  },
  actionBtn: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  actionBtnActive: {
    opacity: 1,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: DARK.textSecondary,
  },
  shortcutsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  shortcutChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  shortcutText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: DARK.textSecondary,
  },
  audienceSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  audienceLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: DARK.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  audienceScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  audienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  audienceChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: DARK.textSecondary,
  },
  imagePreviewContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    height: 180,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
});
