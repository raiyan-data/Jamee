import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [error, setError] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const handleSubmit = () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(username.trim());
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + webTopInset + 60,
            paddingBottom: insets.bottom + webBottomInset + 24,
          },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.brandArea}>
          <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
            <Feather name="moon" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Ummah</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Connect. Inspire. Grow.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.formArea}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>

          <View style={styles.inputGroup}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: error ? theme.danger : theme.border,
                },
              ]}
            >
              <Feather name="user" size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Username"
                placeholderTextColor={theme.textTertiary}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            {!!error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
          </View>

          {isSignUp && (
            <View style={styles.avatarPreview}>
              <View style={[styles.previewCircle, { backgroundColor: theme.primary }]}>
                <Text style={styles.previewLetter}>
                  {username ? username[0].toUpperCase() : "?"}
                </Text>
              </View>
              <Text style={[styles.previewHint, { color: theme.textTertiary }]}>
                Your profile avatar
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={styles.submitText}>
              {isSignUp ? "Get Started" : "Sign In"}
            </Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            {isSignUp ? "Already have an account?" : "New here?"}
          </Text>
          <Pressable onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={[styles.footerLink, { color: theme.primary }]}>
              {isSignUp ? "Sign In" : "Create Account"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  brandArea: {
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  formArea: {
    gap: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  inputGroup: {
    gap: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingLeft: 4,
  },
  avatarPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  previewCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLetter: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  previewHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
