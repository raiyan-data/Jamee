import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/constants/theme";

interface AvatarProps {
  letter?: string;
  imageUri?: string;
  size?: number;
  onPress?: () => void;
  color?: string;
  showBorder?: boolean;
  borderColor?: string;
  online?: boolean;
  testID?: string;
}

export function Avatar({
  letter,
  imageUri,
  size = 40,
  onPress,
  color,
  showBorder = false,
  borderColor,
  online,
  testID,
}: AvatarProps) {
  const theme = useTheme();
  const bgColor = color || theme.primary;
  const fontSize = size * 0.4;
  const ringSize = size + 6;
  const onlineDotSize = Math.max(10, size * 0.25);

  const avatarContent = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      style={[
        styles.image,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View
      style={[
        styles.letterContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize, color: "#FFFFFF" }]}>
        {letter || "?"}
      </Text>
    </View>
  );

  const wrappedContent = (
    <View style={styles.wrapper} testID={testID}>
      {showBorder ? (
        <View
          style={[
            styles.borderRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: borderColor || theme.primary,
            },
          ]}
        >
          {avatarContent}
        </View>
      ) : (
        avatarContent
      )}
      {online !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              width: onlineDotSize,
              height: onlineDotSize,
              borderRadius: onlineDotSize / 2,
              backgroundColor: online ? theme.success : theme.textTertiary,
              borderColor: theme.surface,
              bottom: 0,
              right: showBorder ? 2 : 0,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        testID={testID ? `${testID}-press` : undefined}
      >
        {wrappedContent}
      </Pressable>
    );
  }

  return wrappedContent;
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  letterContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  image: {
    overflow: "hidden",
  },
  borderRing: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    borderWidth: 2,
  },
});
