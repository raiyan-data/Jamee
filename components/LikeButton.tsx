import React, { useCallback } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/constants/theme";

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  size?: number;
  showCount?: boolean;
  activeColor?: string;
  testID?: string;
}

export function LikeButton({
  liked,
  count,
  onToggle,
  size = 24,
  showCount = true,
  activeColor,
  testID,
}: LikeButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const burstOpacity = useSharedValue(0);
  const burstScale = useSharedValue(0.5);
  const fillColor = activeColor || theme.danger;

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.7, { damping: 8, stiffness: 400 }),
      withSpring(1.25, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );

    if (!liked) {
      burstOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(200, withTiming(0, { duration: 300 }))
      );
      burstScale.value = withSequence(
        withTiming(0.5, { duration: 0 }),
        withSpring(1.6, { damping: 6, stiffness: 200 })
      );
    }

    runOnJS(triggerHaptic)();
    onToggle();
  }, [liked, onToggle, scale, burstOpacity, burstScale, triggerHaptic]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  const formattedCount =
    count >= 1000000
      ? `${(count / 1000000).toFixed(1)}M`
      : count >= 1000
      ? `${(count / 1000).toFixed(1)}K`
      : `${count}`;

  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      hitSlop={10}
      testID={testID}
    >
      <View style={styles.iconWrapper}>
        <Animated.View style={[styles.burst, burstStyle]}>
          <View style={[styles.burstDot, { backgroundColor: fillColor, top: -4, left: 4 }]} />
          <View style={[styles.burstDot, { backgroundColor: fillColor, top: 2, right: -2 }]} />
          <View style={[styles.burstDot, { backgroundColor: fillColor, bottom: -2, left: 8 }]} />
          <View style={[styles.burstDot, { backgroundColor: fillColor, top: -2, right: 6 }]} />
        </Animated.View>
        <Animated.View style={iconStyle}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={size}
            color={liked ? fillColor : theme.iconSecondary}
          />
        </Animated.View>
      </View>
      {showCount && (
        <Text
          style={[
            styles.count,
            { color: liked ? fillColor : theme.textSecondary },
          ]}
        >
          {formattedCount}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  burst: {
    position: "absolute",
    width: 28,
    height: 28,
  },
  burstDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
