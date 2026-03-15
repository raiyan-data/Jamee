import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";
import { useTheme } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  value?: string;
  color?: string;
  trackColor?: string;
  animated?: boolean;
  animationDuration?: number;
  children?: React.ReactNode;
  testID?: string;
}

export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  label,
  value,
  color,
  trackColor,
  animated = true,
  animationDuration = 800,
  children,
  testID,
}: ProgressRingProps) {
  const theme = useTheme();
  const progressColor = color || theme.primary;
  const bgTrackColor = trackColor || theme.borderLight;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(1, Math.max(0, progress));
    if (animated) {
      animatedProgress.value = withTiming(clamped, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animatedProgress.value = clamped;
    }
  }, [progress, animated, animationDuration]);

  const animatedStrokeDashoffset = useDerivedValue(() => {
    return circumference * (1 - animatedProgress.value);
  });

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedStrokeDashoffset.value,
  }));

  return (
    <View style={styles.container} testID={testID}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgTrackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={[styles.labelContainer, { width: size, height: size }]}>
        {children ? (
          children
        ) : (
          <>
            {value !== undefined && (
              <Text
                style={[
                  styles.value,
                  {
                    color: theme.text,
                    fontSize: size > 80 ? 20 : 14,
                  },
                ]}
              >
                {value}
              </Text>
            )}
            {label !== undefined && (
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.textTertiary,
                    fontSize: size > 80 ? 11 : 9,
                  },
                ]}
              >
                {label}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

interface MultiRingProps {
  rings: Array<{
    progress: number;
    color: string;
    label?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  gap?: number;
  testID?: string;
}

export function MultiProgressRing({
  rings,
  size = 120,
  strokeWidth = 6,
  gap = 4,
  testID,
}: MultiRingProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      testID={testID}
    >
      <Svg width={size} height={size}>
        {rings.map((ring, i) => {
          const offset = i * (strokeWidth + gap);
          const r = (size - strokeWidth) / 2 - offset;
          const circ = 2 * Math.PI * r;
          const clamped = Math.min(1, Math.max(0, ring.progress));
          const dashOffset = circ * (1 - clamped);

          return (
            <React.Fragment key={i}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={theme.borderLight}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${circ}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={[styles.labelContainer, { width: size, height: size }]}>
        {rings.length > 0 && (
          <View style={styles.multiLabelGroup}>
            {rings.map((ring, i) => (
              <View key={i} style={styles.multiLabelRow}>
                <View
                  style={[
                    styles.multiDot,
                    { backgroundColor: ring.color },
                  ]}
                />
                <Text
                  style={[styles.multiLabelText, { color: theme.textSecondary }]}
                >
                  {ring.label || `${Math.round(ring.progress * 100)}%`}
                </Text>
              </View>
            ))}
          </View>
        )}
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
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  multiLabelGroup: {
    alignItems: "center",
    gap: 2,
  },
  multiLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  multiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  multiLabelText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
});
