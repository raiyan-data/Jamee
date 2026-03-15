export interface Masjid {
  id: string;
  name: string;
  city: string;
  country: string;
}

export interface User {
  id: string;
  username: string;
  profile_picture: string | null;
  bio: string;
  masjid_id: string | null;
  masjid?: Masjid | null;
}

export interface Post {
  id: string;
  user_id: string;
  media_url: string | null;
  caption: string;
  like_count: number;
  created_at: string;
  category: string | null;
}

export interface PostWithUser extends Post {
  user: User;
}

export interface Reel {
  id: string;
  user_id: string;
  media_url: string | null;
  caption: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  color: string;
  user: User;
}

export interface Creator {
  id: string;
  username: string;
  profile_picture: string | null;
  follower_count: number;
  category: string;
}

export interface ExploreCategory {
  id: string;
  title: string;
  category: string;
  color: string;
  icon: string;
}

export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export const PRAYER_NAMES: readonly PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export type NotificationType = "like" | "comment" | "follow" | "masjid_announcement";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_username: string | null;
  actor_avatar: string | null;
  post_id: string | null;
  post_caption: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export type GenderType = "male" | "female" | "prefer_not_to_say" | "";
export type AgeGroup = "13-17" | "18-24" | "25-34" | "35-44" | "45+" | "";

export interface UserProfile {
  user_id: string;
  display_name: string;
  bio: string;
  location: string;
  gender: GenderType;
  age_group: AgeGroup;
  intentions: string;
  avatar_url: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  show_followers: boolean;
  saved_posts: string[];
}

export const DEFAULT_PROFILE: UserProfile = {
  user_id: "",
  display_name: "",
  bio: "",
  location: "",
  gender: "",
  age_group: "",
  intentions: "",
  avatar_url: "",
  followers_count: 1247,
  following_count: 342,
  posts_count: 48,
  show_followers: true,
  saved_posts: [],
};

export type StoryMediaType = "image" | "video" | "text";
export type StoryType = "personal" | "reminder" | "announcement";

export interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  media_url: string | null;
  media_type: StoryMediaType;
  caption: string;
  story_type: StoryType;
  bg_color: string | null;
  ameen_count: number;
  has_ameened: boolean;
  is_seen: boolean;
  expires_at: string;
  created_at: string;
}

export interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
  has_unseen: boolean;
}

export type DMPermission = "everyone" | "same_gender" | "mutual_followers";
export type AccountVisibility = "public" | "private";
export type AppearanceMode = "light" | "dark" | "system";

export interface UserSettings {
  user_id: string;
  dm_permission: DMPermission;
  account_visibility: AccountVisibility;
  restrict_mode: boolean;
  hide_like_counts: boolean;
  chronological_feed: boolean;
  no_music_mode: boolean;
  muted_keywords: string[];
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_masjid: boolean;
  notify_reminders: boolean;
  appearance: AppearanceMode;
  daily_limit_minutes: number;
  reminder_nudges: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  user_id: "",
  dm_permission: "everyone",
  account_visibility: "public",
  restrict_mode: false,
  hide_like_counts: false,
  chronological_feed: false,
  no_music_mode: false,
  muted_keywords: [],
  notify_likes: true,
  notify_comments: true,
  notify_follows: true,
  notify_masjid: true,
  notify_reminders: true,
  appearance: "system",
  daily_limit_minutes: 60,
  reminder_nudges: true,
};
