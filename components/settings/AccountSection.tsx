import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, Platform, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

export function AccountSection() {
  const theme = useTheme();
  const { username, currentUserId, logout, updateProfile } = useApp();
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      logout();
      router.replace("/login");
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
            router.replace("/login");
          },
        },
      ]);
    }
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === username) {
      setEditingUsername(false);
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      const url = new URL(`/api/profile/${currentUserId}`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to save username");
      await updateProfile({ username: trimmed });
      setEditingUsername(false);
    } catch (err) {
      console.error("[AccountSection] Failed to save username:", err);
      setUsernameError("Failed to save. Please try again.");
      setNewUsername(username);
    } finally {
      setIsSavingUsername(false);
    }
  };

  return (
    <SettingsSection title="Account" testID="settings-account">
      <SettingsRow
        icon="mail"
        label="Email"
        value="Not set"
        onPress={() => {}}
        testID="settings-email"
      />
      {editingUsername ? (
        <View style={[styles.inputRow, { borderBottomColor: theme.borderLight }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Feather name="user" size={18} color={theme.primary} />
          </View>
          <TextInput
            style={[styles.input, {
              color: theme.text,
              borderColor: usernameError ? theme.danger : theme.border,
              backgroundColor: theme.surfaceSecondary,
            }]}
            value={newUsername}
            onChangeText={(t) => { setNewUsername(t); setUsernameError(null); }}
            onBlur={handleSaveUsername}
            onSubmitEditing={handleSaveUsername}
            autoFocus
            placeholder="Enter username"
            placeholderTextColor={theme.textTertiary}
            editable={!isSavingUsername}
            testID="settings-username-input"
          />
          {isSavingUsername ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.saveIndicator} />
          ) : (
            <Pressable onPress={handleSaveUsername} hitSlop={8} style={styles.saveBtn} testID="settings-username-save">
              <Feather name="check" size={18} color={theme.primary} />
            </Pressable>
          )}
        </View>
      ) : (
        <SettingsRow
          icon="user"
          label="Username"
          value={username}
          onPress={() => {
            setNewUsername(username);
            setUsernameError(null);
            setEditingUsername(true);
          }}
          testID="settings-username"
        />
      )}
      {usernameError && (
        <Text style={[styles.errorText, { color: theme.danger }]}>{usernameError}</Text>
      )}
      <SettingsRow
        icon="lock"
        label="Change Password"
        subtitle="Coming soon"
        onPress={() => {}}
        testID="settings-password"
      />
      <SettingsRow
        icon="log-out"
        label="Log Out"
        onPress={handleLogout}
        danger
        testID="settings-logout"
      />
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveIndicator: {
    marginLeft: 10,
  },
  saveBtn: {
    marginLeft: 10,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingBottom: 8,
    marginTop: -4,
  },
});
