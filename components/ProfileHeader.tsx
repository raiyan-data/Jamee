import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/constants/theme";
import type { Masjid } from "@/types/models";

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

export interface Badge {
  icon: string;
  label: string;
  color: string;
}

interface ProfileHeaderProps {
  username: string;
  displayName?: string;
  bio: string;
  avatarLetter: string;
  avatarColor?: string;
  avatarImageUri?: string;
  location?: string;
  stats: ProfileStats;
  showFollowers?: boolean;
  badges?: Badge[];
  streak?: number;
  masjid?: Masjid | null;
  onMasjidPress?: () => void;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  onEditProfile?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onAvatarPress?: () => void;
  testID?: string;
}

export function ProfileHeader({
  username,
  displayName,
  bio,
  avatarLetter,
  avatarColor,
  avatarImageUri,
  location,
  stats,
  showFollowers = true,
  badges = [],
  streak,
  masjid,
  onMasjidPress,
  isOwnProfile = true,
  isFollowing = false,
  onEditProfile,
  onShare,
  onFollow,
  onAvatarPress,
  testID,
}: ProfileHeaderProps) {
  const theme = useTheme();

  const formatStat = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFollow?.();
  };

  const avatarBg = avatarColor ?? theme.primary;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.profileArea}>
        <Pressable
          onPress={isOwnProfile ? onAvatarPress : undefined}
          style={styles.avatarContainer}
          testID="profile-avatar-btn"
        >
          <View style={[styles.avatarWrap, { borderColor: theme.primary + "40" }]}>
            {avatarImageUri ? (
              <Image
                source={{ uri: avatarImageUri }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: avatarBg + "20" }]}>
                <Text style={[styles.avatarLetter, { color: avatarBg }]}>{avatarLetter}</Text>
              </View>
            )}
          </View>
          {isOwnProfile && (
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
              <Feather name="camera" size={10} color="#fff" />
            </View>
          )}
        </Pressable>

        <Text style={[styles.displayName, { color: theme.text }]}>
          {displayName || username}
        </Text>
        <Text style={[styles.username, { color: theme.textSecondary }]}>@{username}</Text>

        {(location || masjid) && (
          <View style={styles.metaRow}>
            {location ? (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={12} color={theme.textTertiary} />
                <Text style={[styles.metaText, { color: theme.textTertiary }]}>{location}</Text>
              </View>
            ) : null}
            {masjid ? (
              <Pressable onPress={onMasjidPress} style={styles.metaItem} testID="masjid-badge">
                <Feather name="home" size={12} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.primary }]} numberOfLines={1}>{masjid.name}</Text>
              </Pressable>
            ) : isOwnProfile ? (
              <Pressable onPress={onMasjidPress} style={styles.metaItem} testID="masjid-join">
                <Feather name="plus" size={12} color={theme.textTertiary} />
                <Text style={[styles.metaText, { color: theme.textTertiary }]}>Join a Masjid</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {bio ? (
          <Text style={[styles.bioText, { color: theme.textSecondary }]}>{bio}</Text>
        ) : null}
      </View>

      <View style={[styles.statsRow, { borderColor: theme.borderLight }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{formatStat(stats.posts)}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        {showFollowers ? (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatStat(stats.followers)}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Followers</Text>
          </View>
        ) : (
          <View style={styles.statItem}>
            <Feather name="lock" size={16} color={theme.textTertiary} />
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Followers</Text>
          </View>
        )}
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{formatStat(stats.following)}</Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Following</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {isOwnProfile ? (
          <>
            <Pressable
              onPress={onEditProfile}
              style={({ pressed }) => [styles.btn, styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary, opacity: pressed ? 0.8 : 1 }]}
              testID="edit-profile-btn"
            >
              <Feather name="edit-2" size={15} color={theme.text} />
              <Text style={[styles.btnText, { color: theme.text }]}>Edit Profile</Text>
            </Pressable>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [styles.btn, styles.shareBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="share-2" size={15} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>Share</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleFollow}
              style={({ pressed }) => [
                styles.btn,
                isFollowing ? [styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }] : [styles.primaryBtn, { backgroundColor: theme.primary }],
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.btnText, { color: isFollowing ? theme.text : "#fff" }]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [styles.btn, styles.outlineBtn, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="message-circle" size={15} color={theme.text} />
              <Text style={[styles.btnText, { color: theme.text }]}>Message</Text>
            </Pressable>
          </>
        )}
      </View>

      {badges.length > 0 && (
        <View style={[styles.badgesSection, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
          <View style={styles.badgesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Badges</Text>
            {streak !== undefined && streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: theme.accentLight }]}>
                <Feather name="zap" size={13} color={theme.accent} />
                <Text style={[styles.streakText, { color: theme.accent }]}>{streak} days</Text>
              </View>
            )}
          </View>
          <View style={styles.badgesGrid}>
            {badges.map((badge, i) => (
              <View key={i} style={styles.badgeItem}>
                <View style={[styles.badgeIcon, { backgroundColor: badge.color + "18" }]}>
                  <Feather name={badge.icon as any} size={18} color={badge.color} />
                </View>
                <Text style={[styles.badgeLabel, { color: theme.textSecondary }]} numberOfLines={1}>{badge.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  profileArea: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 6,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    marginBottom: 4,
    position: "relative" as const,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarImage: {
    width: 88,
    height: 88,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  avatarEditBadge: {
    position: "absolute" as const,
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  displayName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  username: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    maxWidth: 140,
  },
  bioText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 290,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    marginHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    gap: 6,
  },
  outlineBtn: {
    borderWidth: 1,
  },
  primaryBtn: {},
  shareBtn: {},
  btnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  badgesSection: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 20,
  },
  badgesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  badgesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badgeItem: {
    alignItems: "center",
    gap: 6,
    width: 70,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
