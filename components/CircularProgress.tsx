import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/constants/theme";

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  value?: string;
  color?: string;
}

export function CircularProgress({
  progress,
  size = 100,
  strokeWidth = 8,
  label,
  value,
  color,
}: CircularProgressProps) {
  const theme = useTheme();
  const progressColor = color || theme.primary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.borderLight}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.labelContainer, { width: size, height: size }]}>
        {value && <Text style={[styles.value, { color: theme.text }]}>{value}</Text>}
        {label && <Text style={[styles.label, { color: theme.textTertiary }]}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
