import React from "react";
import { View, Text, StyleSheet, Pressable, Switch, ActivityIndicator, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";

interface SettingsRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
  isSaving?: boolean;
  testID?: string;
}

export function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  isToggle,
  toggleValue,
  onToggle,
  onPress,
  danger,
  isSaving,
  testID,
}: SettingsRowProps) {
  const theme = useTheme();
  const textColor = danger ? theme.danger : theme.text;

  const renderRight = () => {
    if (isToggle && onToggle) {
      if (isSaving) {
        return (
          <ActivityIndicator
            size="small"
            color={theme.primary}
            testID={testID ? `${testID}-saving` : undefined}
          />
        );
      }
      return (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          disabled={isSaving}
          trackColor={{ false: theme.border, true: theme.primary + "60" }}
          thumbColor={toggleValue ? theme.primary : theme.textTertiary}
          testID={testID ? `${testID}-switch` : undefined}
        />
      );
    }
    if (value) {
      return (
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: theme.textSecondary }]}>{value}</Text>
          <Feather name="chevron-right" size={16} color={theme.textTertiary} />
        </View>
      );
    }
    if (onPress) {
      return <Feather name="chevron-right" size={16} color={theme.textTertiary} />;
    }
    return null;
  };

  const content = (
    <View style={[styles.row, { borderBottomColor: theme.borderLight }]} testID={testID}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: danger ? theme.danger + "15" : theme.primaryLight }]}>
          <Feather name={icon} size={18} color={danger ? theme.danger : theme.primary} />
        </View>
      )}
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {renderRight()}
    </View>
  );

  if (onPress && !isToggle) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  labelWrap: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
