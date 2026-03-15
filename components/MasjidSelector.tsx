import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/constants/theme";
import { fetchMasjids } from "@/lib/data";
import type { Masjid } from "@/types/models";

interface MasjidSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (masjid: Masjid | null) => void;
  currentMasjidId?: string | null;
}

export function MasjidSelector({ visible, onClose, onSelect, currentMasjidId }: MasjidSelectorProps) {
  const theme = useTheme();
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadMasjids = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    let stale = false;
    fetchMasjids()
      .then((data) => {
        if (!stale) {
          setMasjids(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!stale) {
          setHasError(true);
          setIsLoading(false);
        }
      });
    return () => { stale = true; };
  }, []);

  useEffect(() => {
    if (visible) {
      const cleanup = loadMasjids();
      return cleanup;
    }
  }, [visible, loadMasjids]);

  const handleSelect = (masjid: Masjid) => {
    onSelect(masjid);
    onClose();
  };

  const handleRemove = () => {
    onSelect(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Select Your Masjid</Text>
            <Pressable onPress={onClose} hitSlop={12} testID="masjid-close">
              <Feather name="x" size={22} color={theme.icon} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : hasError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                Could not load masjids
              </Text>
              <Pressable
                onPress={loadMasjids}
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={masjids}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                currentMasjidId ? (
                  <Pressable
                    onPress={handleRemove}
                    style={[styles.removeRow, { borderColor: theme.border }]}
                    testID="masjid-remove"
                  >
                    <Feather name="x-circle" size={18} color={theme.danger} />
                    <Text style={[styles.removeText, { color: theme.danger }]}>
                      Remove Masjid Affiliation
                    </Text>
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No masjids available
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = item.id === currentMasjidId;
                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                      styles.masjidRow,
                      {
                        backgroundColor: isSelected
                          ? theme.primary + "12"
                          : pressed
                          ? theme.surfaceSecondary
                          : "transparent",
                        borderColor: isSelected ? theme.primary + "40" : theme.borderLight,
                      },
                    ]}
                    testID={`masjid-${item.id}`}
                  >
                    <View style={[styles.masjidIcon, { backgroundColor: theme.primary + "15" }]}>
                      <Feather name="home" size={18} color={theme.primary} />
                    </View>
                    <View style={styles.masjidInfo}>
                      <Text style={[styles.masjidName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.masjidLocation, { color: theme.textTertiary }]} numberOfLines={1}>
                        {item.city}, {item.country}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={20} color={theme.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "web" ? 34 : 0,
  },
  handle: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 14,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  removeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  removeText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  masjidRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  masjidIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  masjidInfo: {
    flex: 1,
    gap: 2,
  },
  masjidName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  masjidLocation: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
