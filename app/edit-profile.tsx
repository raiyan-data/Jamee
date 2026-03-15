import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Platform, ActivityIndicator, Alert,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";
import { useSettings } from "@/contexts/SettingsContext";
import { MasjidSelector } from "@/components/MasjidSelector";
import { uploadAvatar, joinMasjid } from "@/lib/data";
import type { Masjid, GenderType, AgeGroup } from "@/types/models";

const GENDER_OPTIONS: { value: GenderType; label: string }[] = [
  { value: "male", label: "Brother" },
  { value: "female", label: "Sister" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "13-17", label: "13-17" },
  { value: "18-24", label: "18-24" },
  { value: "25-34", label: "25-34" },
  { value: "35-44", label: "35-44" },
  { value: "45+", label: "45+" },
];

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.fieldRow, { borderBottomColor: theme.borderLight }]}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.fieldValue}>{children}</View>
    </View>
  );
}

function ChipGroup<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[
            styles.chip,
            {
              backgroundColor: value === opt.value ? theme.primary : theme.surfaceSecondary,
              borderColor: value === opt.value ? theme.primary : theme.borderLight,
            },
          ]}
          testID={`chip-${opt.value}`}
        >
          <Text style={[styles.chipText, { color: value === opt.value ? "#fff" : theme.text }]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function EditProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { username, displayName, bio, avatarUri, avatarLetter, location, gender, ageGroup,
          intentions, masjid, currentUserId, showFollowers, updateProfile, setMasjid } = useApp();
  const { settings } = useSettings();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [formDisplayName, setFormDisplayName] = useState(displayName || username);
  const [formBio, setFormBio] = useState(bio);
  const [formLocation, setFormLocation] = useState(location);
  const [formGender, setFormGender] = useState<GenderType>(gender);
  const [formAgeGroup, setFormAgeGroup] = useState<AgeGroup>(ageGroup);
  const [formIntentions, setFormIntentions] = useState(intentions);
  const [formAvatarUri, setFormAvatarUri] = useState(avatarUri);
  const [formShowFollowers, setFormShowFollowers] = useState(showFollowers);
  const [formMasjid, setFormMasjid] = useState<Masjid | null>(masjid);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [masjidSelectorVisible, setMasjidSelectorVisible] = useState(false);

  const avatarScale = useSharedValue(1);
  const avatarAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }));

  const handlePickAvatar = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    avatarScale.value = withSequence(withTiming(0.92, { duration: 100 }), withTiming(1, { duration: 150 }));

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    setIsUploadingAvatar(true);
    setFormAvatarUri(localUri);

    try {
      if (currentUserId) {
        const finalUrl = await uploadAvatar(currentUserId, localUri);
        setFormAvatarUri(finalUrl);
      }
    } catch {
      // keep local URI
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [currentUserId, avatarScale]);

  const handleMasjidSelect = useCallback(async (selected: Masjid | null) => {
    setFormMasjid(selected);
    if (currentUserId) {
      await joinMasjid(currentUserId, selected?.id ?? null).catch(() => {});
    }
  }, [currentUserId]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await updateProfile({
        displayName: formDisplayName.trim(),
        bio: formBio.trim(),
        location: formLocation.trim(),
        gender: formGender,
        ageGroup: formAgeGroup,
        intentions: formIntentions.trim(),
        avatarUri: formAvatarUri,
        showFollowers: formShowFollowers,
      });
      setMasjid(formMasjid);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, formDisplayName, formBio, formLocation, formGender, formAgeGroup,
      formIntentions, formAvatarUri, formShowFollowers, formMasjid, updateProfile, setMasjid]);

  const avatarBg = theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} testID="edit-profile-screen">
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: theme.borderLight }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="edit-profile-back">
          <Feather name="x" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: isSaving ? 0.7 : 1 }]}
          disabled={isSaving}
          testID="edit-profile-save"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar} testID="avatar-upload-btn">
            <Animated.View style={[styles.avatarWrap, { borderColor: theme.primary + "40" }, avatarAnimStyle]}>
              {formAvatarUri ? (
                <Image source={{ uri: formAvatarUri }} style={styles.avatarImg} contentFit="cover" transition={300} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: avatarBg + "20" }]}>
                  <Text style={[styles.avatarLetterText, { color: avatarBg }]}>{avatarLetter}</Text>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="camera" size={14} color="#fff" />
                )}
              </View>
            </Animated.View>
          </Pressable>
          <Text style={[styles.changePhotoText, { color: theme.primary }]}>
            {isUploadingAvatar ? "Uploading..." : "Change Photo"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <FieldRow label="Display Name">
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={formDisplayName}
              onChangeText={setFormDisplayName}
              placeholder="Your name"
              placeholderTextColor={theme.textTertiary}
              testID="field-display-name"
            />
          </FieldRow>
          <FieldRow label="Bio">
            <TextInput
              style={[styles.input, styles.multiInput, { color: theme.text }]}
              value={formBio}
              onChangeText={setFormBio}
              placeholder="Tell your story..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={160}
              testID="field-bio"
            />
          </FieldRow>
          <FieldRow label="City">
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={formLocation}
              onChangeText={setFormLocation}
              placeholder="Your city"
              placeholderTextColor={theme.textTertiary}
              testID="field-location"
            />
          </FieldRow>
          <FieldRow label="Masjid">
            <Pressable
              onPress={() => setMasjidSelectorVisible(true)}
              style={[styles.selectorBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderLight }]}
              testID="field-masjid"
            >
              <Feather name="home" size={14} color={formMasjid ? theme.primary : theme.textTertiary} />
              <Text style={[styles.selectorText, { color: formMasjid ? theme.text : theme.textTertiary }]} numberOfLines={1}>
                {formMasjid ? formMasjid.name : "Select a masjid"}
              </Text>
              <Feather name="chevron-right" size={14} color={theme.textTertiary} />
            </Pressable>
          </FieldRow>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.primary }]}>Personal</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <FieldRow label="I am a">
            <ChipGroup options={GENDER_OPTIONS} value={formGender} onChange={setFormGender} />
          </FieldRow>
          <FieldRow label="Age Group">
            <ChipGroup options={AGE_OPTIONS} value={formAgeGroup} onChange={setFormAgeGroup} />
          </FieldRow>
          <FieldRow label="Intentions">
            <TextInput
              style={[styles.input, styles.multiInput, { color: theme.text }]}
              value={formIntentions}
              onChangeText={setFormIntentions}
              placeholder="What's your intention for being here? (e.g., learn, connect, grow...)"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={2}
              maxLength={200}
              testID="field-intentions"
            />
          </FieldRow>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.primary }]}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Show Follower Count</Text>
              <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>Others can see your follower count</Text>
            </View>
            <Pressable
              onPress={() => setFormShowFollowers(!formShowFollowers)}
              style={[
                styles.toggle,
                { backgroundColor: formShowFollowers ? theme.primary + "60" : theme.border },
              ]}
              testID="toggle-show-followers"
            >
              <View style={[styles.toggleThumb, { backgroundColor: formShowFollowers ? theme.primary : theme.textTertiary, alignSelf: formShowFollowers ? "flex-end" : "flex-start" }]} />
            </Pressable>
          </View>
          <View style={[styles.privacyPreview, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderLight }]}>
            <View style={styles.privacyRow}>
              <Feather name="eye" size={14} color={theme.textSecondary} />
              <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
                Profile: {settings.account_visibility === "private" ? "Private" : "Public"}
              </Text>
            </View>
            <View style={styles.privacyRow}>
              <Feather name="message-circle" size={14} color={theme.textSecondary} />
              <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
                DMs: {settings.dm_permission === "everyone" ? "Everyone" : settings.dm_permission === "same_gender" ? "Same Gender" : "Mutual Followers"}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/settings")} style={styles.privacyLink}>
              <Text style={[styles.privacyLinkText, { color: theme.primary }]}>Manage in Settings →</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <MasjidSelector
        visible={masjidSelectorVisible}
        onClose={() => setMasjidSelectorVisible(false)}
        onSelect={handleMasjidSelect}
        currentMasjidId={formMasjid?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative" as const,
  },
  avatarImg: { width: 96, height: 96 },
  avatarFallback: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetterText: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
  },
  cameraBadge: {
    position: "absolute" as const,
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {},
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
    minHeight: 24,
  },
  multiInput: {
    minHeight: 56,
    textAlignVertical: "top",
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  privacyPreview: {
    margin: 12,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  privacyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  privacyLink: { marginTop: 4 },
  privacyLinkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
