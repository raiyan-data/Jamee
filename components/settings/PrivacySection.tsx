import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";
import type { DMPermission, AccountVisibility } from "@/types/models";

const DM_OPTIONS: { value: DMPermission; label: string; desc: string }[] = [
  { value: "everyone", label: "Everyone", desc: "Anyone can send you messages" },
  { value: "same_gender", label: "Same Gender Only", desc: "Only same-gender users can message you" },
  { value: "mutual_followers", label: "Mutual Followers", desc: "Only people you both follow" },
];

const VISIBILITY_OPTIONS: { value: AccountVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export function PrivacySection() {
  const theme = useTheme();
  const { settings, updateSetting, isSavingKey } = useSettings();
  const [dmModalVisible, setDmModalVisible] = useState(false);

  const currentDmLabel = DM_OPTIONS.find((o) => o.value === settings.dm_permission)?.label ?? "Everyone";

  return (
    <>
      <SettingsSection title="Privacy & Safety" testID="settings-privacy">
        <SettingsRow
          icon="message-circle"
          label="DM Permissions"
          value={currentDmLabel}
          onPress={() => setDmModalVisible(true)}
          testID="settings-dm"
        />
        <View style={[styles.segmentRow, { borderBottomColor: theme.borderLight }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Feather name="eye" size={18} color={theme.primary} />
          </View>
          <Text style={[styles.segLabel, { color: theme.text }]}>Account Visibility</Text>
          <View style={[styles.segmentControl, { backgroundColor: theme.surfaceSecondary }]}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => !isSavingKey("account_visibility") && updateSetting("account_visibility", opt.value)}
                style={[
                  styles.segment,
                  settings.account_visibility === opt.value && { backgroundColor: theme.primary },
                  isSavingKey("account_visibility") && { opacity: 0.6 },
                ]}
                testID={`settings-visibility-${opt.value}`}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: settings.account_visibility === opt.value ? "#fff" : theme.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <SettingsRow
          icon="slash"
          label="Blocked Users"
          subtitle="Manage blocked accounts"
          onPress={() => {}}
          testID="settings-blocked"
        />
        <SettingsRow
          icon="shield"
          label="Restrict Mode"
          subtitle="Limit interactions from unknown users"
          isToggle
          toggleValue={settings.restrict_mode}
          onToggle={(val) => updateSetting("restrict_mode", val)}
          isSaving={isSavingKey("restrict_mode")}
          testID="settings-restrict"
        />
      </SettingsSection>

      <Modal visible={dmModalVisible} transparent animationType="fade" onRequestClose={() => setDmModalVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={() => setDmModalVisible(false)}>
          <View style={[styles.modal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>DM Permissions</Text>
            {DM_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.option,
                  { borderBottomColor: theme.borderLight },
                  settings.dm_permission === opt.value && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => {
                  updateSetting("dm_permission", opt.value);
                  setDmModalVisible(false);
                }}
                testID={`settings-dm-${opt.value}`}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>{opt.desc}</Text>
                </View>
                {settings.dm_permission === opt.value && (
                  <Feather name="check" size={20} color={theme.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  segLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  segmentControl: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
