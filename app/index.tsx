import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/constants/theme";
import { useApp } from "@/contexts/AppContext";

export default function IndexScreen() {
  const theme = useTheme();
  const { isLoggedIn, isHydrated } = useApp();

  useEffect(() => {
    if (!isHydrated) return;
    if (isLoggedIn) {
      router.replace("/(tabs)");
    } else {
      router.replace("/login");
    }
  }, [isHydrated, isLoggedIn]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
