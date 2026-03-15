import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

export function ContentSection() {
  const theme = useTheme();
  const { settings, updateSetting, addMutedKeyword, removeMutedKeyword, isSavingKey } = useSettings();
  const [keywordInput, setKeywordInput] = useState("");
  const [showKeywords, setShowKeywords] = useState(false);

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      addMutedKeyword(keywordInput);
      setKeywordInput("");
    }
  };

  return (
    <SettingsSection title="Content Preferences" testID="settings-content">
      <SettingsRow
        icon="eye-off"
        label="Hide Like Counts"
        subtitle="Don't show like counts on posts"
        isToggle
        toggleValue={settings.hide_like_counts}
        onToggle={(val) => updateSetting("hide_like_counts", val)}
        isSaving={isSavingKey("hide_like_counts")}
        testID="settings-hide-likes"
      />
      <SettingsRow
        icon="clock"
        label="Chronological Feed"
        subtitle="Show posts in chronological order"
        isToggle
        toggleValue={settings.chronological_feed}
        onToggle={(val) => updateSetting("chronological_feed", val)}
        isSaving={isSavingKey("chronological_feed")}
        testID="settings-chrono"
      />
      <SettingsRow
        icon="volume-x"
        label="No-Music Mode"
        subtitle="Mute audio on all video content"
        isToggle
        toggleValue={settings.no_music_mode}
        onToggle={(val) => updateSetting("no_music_mode", val)}
        isSaving={isSavingKey("no_music_mode")}
        testID="settings-no-music"
      />
      <SettingsRow
        icon="filter"
        label="Muted Keywords"
        subtitle={`${settings.muted_keywords.length} keyword${settings.muted_keywords.length !== 1 ? "s" : ""} muted`}
        onPress={() => setShowKeywords(!showKeywords)}
        testID="settings-muted-keywords"
      />
      {showKeywords && (
        <View style={[styles.keywordsArea, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
              value={keywordInput}
              onChangeText={setKeywordInput}
              placeholder="Add keyword..."
              placeholderTextColor={theme.textTertiary}
              onSubmitEditing={handleAddKeyword}
              returnKeyType="done"
              testID="settings-keyword-input"
            />
            <Pressable
              onPress={handleAddKeyword}
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              testID="settings-keyword-add"
            >
              <Feather name="plus" size={18} color="#fff" />
            </Pressable>
          </View>
          {settings.muted_keywords.length > 0 && (
            <View style={styles.chips}>
              {settings.muted_keywords.map((kw) => (
                <View key={kw} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.chipText, { color: theme.text }]}>{kw}</Text>
                  <Pressable
                    onPress={() => removeMutedKeyword(kw)}
                    hitSlop={8}
                    testID={`settings-keyword-remove-${kw}`}
                  >
                    <Feather name="x" size={14} color={theme.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  keywordsArea: {
    padding: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
