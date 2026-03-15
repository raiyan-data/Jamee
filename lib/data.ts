import type { User, Post, PostWithUser, Reel, Creator, ExploreCategory, Masjid } from "@/types/models";
import type { CommentData } from "@/components/CommentItem";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/query-client";
import { Platform } from "react-native";

const SEED_USERS: User[] = [
  { id: "u1", username: "abdulrahman", profile_picture: "https://i.pravatar.cc/150?u=abdulrahman", bio: "Seeking knowledge, sharing wisdom.", masjid_id: null },
  { id: "u2", username: "fatima.writes", profile_picture: "https://i.pravatar.cc/150?u=fatima", bio: "Writer and educator. Alhamdulillah for every word.", masjid_id: null },
  { id: "u3", username: "islamic.wisdom", profile_picture: "https://i.pravatar.cc/150?u=wisdom", bio: "Sharing the timeless wisdom of Islam.", masjid_id: null },
  { id: "u4", username: "aisha.creates", profile_picture: "https://i.pravatar.cc/150?u=aisha", bio: "Art, architecture, and the beauty of creation.", masjid_id: null },
  { id: "u5", username: "omar.dev", profile_picture: "https://i.pravatar.cc/150?u=omar", bio: "Muslim developer building for the ummah.", masjid_id: null },
  { id: "u6", username: "quran.daily", profile_picture: "https://i.pravatar.cc/150?u=quran", bio: "Daily Quran recitations and reflections.", masjid_id: null },
  { id: "u7", username: "islamic.art", profile_picture: "https://i.pravatar.cc/150?u=art", bio: "Celebrating Islamic art and calligraphy.", masjid_id: null },
  { id: "u8", username: "halal.chef", profile_picture: "https://i.pravatar.cc/150?u=chef", bio: "Halal recipes for every occasion.", masjid_id: null },
  { id: "u9", username: "travel.ummah", profile_picture: "https://i.pravatar.cc/150?u=travel", bio: "Exploring the beauty of the Muslim world.", masjid_id: null },
];

const SEED_REELS: Omit<Reel, "user">[] = [
  {
    id: "r1", user_id: "u6", media_url: null,
    caption: "Beautiful recitation of Surah Al-Mulk - Listen and reflect on the words of Allah",
    like_count: 4521, comment_count: 234, share_count: 567,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), color: "#1B5E3B",
  },
  {
    id: "r2", user_id: "u7", media_url: null,
    caption: "Mesmerizing Islamic calligraphy in motion - Bismillah Al-Rahman Al-Raheem",
    like_count: 8934, comment_count: 456, share_count: 890,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), color: "#0D4A2E",
  },
  {
    id: "r3", user_id: "u8", media_url: null,
    caption: "Easy halal recipe: Lamb Biryani that feeds the soul and the stomach",
    like_count: 3456, comment_count: 189, share_count: 234,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), color: "#2D1B0E",
  },
  {
    id: "r4", user_id: "u9", media_url: null,
    caption: "Sunrise at Masjid Al-Aqsa - A view that touches the heart",
    like_count: 12345, comment_count: 789, share_count: 1234,
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), color: "#1A3A5C",
  },
];

const userMap = new Map(SEED_USERS.map((u) => [u.id, u]));

function getUserById(id: string): User {
  return userMap.get(id) ?? { id, username: "unknown", profile_picture: null, bio: "" };
}

function seedReels(): Reel[] {
  return SEED_REELS.map((reel) => ({
    ...reel,
    user: getUserById(reel.user_id),
  }));
}

export async function fetchLocalPosts(): Promise<PostWithUser[]> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/posts/local", base);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.posts ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      media_url: row.media_url ?? null,
      caption: row.caption,
      like_count: row.like_count ?? 0,
      created_at: row.created_at,
      category: null,
      user: {
        id: row.user_id,
        username: row.username,
        profile_picture: row.avatar_url ?? null,
        bio: "",
        masjid_id: null,
      },
      is_dua: row.is_dua ?? false,
      audience: row.audience ?? "public",
    }));
  } catch {
    return [];
  }
}

export async function createLocalPost(params: {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  caption: string;
  media_url?: string | null;
  audience?: string;
  is_dua?: boolean;
}): Promise<PostWithUser | null> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/posts", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const row = await res.json();
    return {
      id: row.id,
      user_id: row.user_id,
      media_url: row.media_url ?? null,
      caption: row.caption,
      like_count: 0,
      created_at: row.created_at,
      category: null,
      user: {
        id: row.user_id,
        username: row.username,
        profile_picture: row.avatar_url ?? null,
        bio: "",
        masjid_id: null,
      },
    };
  } catch {
    return null;
  }
}

export async function uploadMedia(localUri: string, mimeType: string): Promise<string | null> {
  try {
    let base64: string;

    if (Platform.OS === "web") {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const reader = new FileReader();
      base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const FileSystem = await import("expo-file-system");
      const b64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64 = `data:${mimeType};base64,${b64}`;
    }

    const base = getApiUrl();
    const url = new URL("/api/upload", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: base64, mimeType }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

export async function fetchPosts(): Promise<PostWithUser[]> {
  const results = await Promise.allSettled([
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, media_url, caption, like_count, created_at, category, user:users(id, username, profile_picture, bio)")
        .order("created_at", { ascending: false });
      if (error) return [];
      if (!data) return [];
      return data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        media_url: row.media_url,
        caption: row.caption,
        like_count: row.like_count ?? 0,
        created_at: row.created_at,
        category: row.category ?? null,
        user: Array.isArray(row.user) ? row.user[0] : row.user ?? { id: row.user_id, username: "unknown", profile_picture: null, bio: "" },
      }));
    })(),
    fetchLocalPosts(),
  ]);

  const supabasePosts = results[0].status === "fulfilled" ? results[0].value : [];
  const localPosts = results[1].status === "fulfilled" ? results[1].value : [];

  const seen = new Set<string>();
  const merged: PostWithUser[] = [];
  for (const p of [...localPosts, ...supabasePosts]) {
    if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
  }
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

export async function fetchVideoPosts(category?: string): Promise<PostWithUser[]> {
  let query = supabase
    .from("posts")
    .select("id, user_id, media_url, caption, like_count, created_at, category, user:users(id, username, profile_picture, bio)")
    .not("category", "is", null)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    media_url: row.media_url,
    caption: row.caption,
    like_count: row.like_count ?? 0,
    created_at: row.created_at,
    category: row.category ?? null,
    user: Array.isArray(row.user) ? row.user[0] : row.user ?? { id: row.user_id, username: "unknown", profile_picture: null, bio: "" },
  }));
}

export async function fetchPostById(postId: string): Promise<PostWithUser | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, media_url, caption, like_count, created_at, category, user:users(id, username, profile_picture, bio)")
    .eq("id", postId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    user_id: row.user_id,
    media_url: row.media_url,
    caption: row.caption,
    like_count: row.like_count ?? 0,
    created_at: row.created_at,
    category: row.category ?? null,
    user: Array.isArray(row.user) ? row.user[0] : row.user ?? { id: row.user_id, username: "unknown", profile_picture: null, bio: "" },
  };
}

export async function fetchReels(): Promise<Reel[]> {
  return seedReels();
}

export async function fetchCreators(): Promise<Creator[]> {
  return [
    { id: "u3", username: "mufti.answers", profile_picture: null, follower_count: 120000, category: "Islamic Knowledge" },
    { id: "u6", username: "quran.teacher", profile_picture: null, follower_count: 89000, category: "Quran" },
    { id: "u8", username: "halal.living", profile_picture: null, follower_count: 56000, category: "Lifestyle" },
    { id: "u5", username: "muslim.tech", profile_picture: null, follower_count: 34000, category: "Technology" },
    { id: "u9", username: "deen.fitness", profile_picture: null, follower_count: 78000, category: "Fitness" },
    { id: "u7", username: "noor.art", profile_picture: null, follower_count: 45000, category: "Art" },
  ];
}

export async function fetchCategories(): Promise<ExploreCategory[]> {
  return [
    { id: "e1", title: "Quran Recitations", category: "Quran", color: "#0D7C4A", icon: "book-open" },
    { id: "e2", title: "Daily Reminders", category: "Reminders", color: "#C9A84C", icon: "bell" },
    { id: "e3", title: "Islamic History", category: "History", color: "#3B82F6", icon: "clock" },
    { id: "e4", title: "Halal Recipes", category: "Food", color: "#EF4444", icon: "heart" },
    { id: "e5", title: "Travel & Mosques", category: "Travel", color: "#8B5CF6", icon: "map-pin" },
    { id: "e6", title: "Family & Parenting", category: "Family", color: "#F59E0B", icon: "users" },
    { id: "e7", title: "Islamic Finance", category: "Finance", color: "#10B981", icon: "trending-up" },
    { id: "e8", title: "Dua Collection", category: "Dua", color: "#6366F1", icon: "star" },
  ];
}

export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, profile_picture, bio")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return { ...(data as any), masjid_id: null };
}

export async function fetchUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, profile_picture, bio")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return { ...(data as any), masjid_id: null };
}

export async function createNotification(payload: {
  user_id: string;
  type: "like" | "comment" | "follow" | "masjid_announcement";
  actor_id?: string | null;
  actor_username?: string | null;
  actor_avatar?: string | null;
  post_id?: string | null;
  post_caption?: string | null;
  message?: string | null;
}): Promise<void> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/notifications", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn("createNotification error:", await res.text());
  } catch (err) {
    console.warn("createNotification failed:", err);
  }
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    const fileName = `avatar_${userId}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { contentType: mimeType, upsert: true });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.warn("Avatar upload failed, using local URI:", err);
    return localUri;
  }
}

export async function fetchMasjids(): Promise<Masjid[]> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/masjids", baseUrl);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch masjids");
  return res.json();
}

export async function joinMasjid(_userId: string, _masjidId: string | null): Promise<boolean> {
  return true;
}

export async function likePost(postId: string, _userId: string): Promise<{ success: boolean }> {
  const { error } = await supabase.rpc("increment_like_count", { post_id: postId });
  if (error) {
    console.error("Supabase likePost error:", error.message);
    return { success: false };
  }
  return { success: true };
}

export async function unlikePost(postId: string, _userId: string): Promise<{ success: boolean }> {
  const { error } = await supabase.rpc("decrement_like_count", { post_id: postId });
  if (error) {
    console.error("Supabase unlikePost error:", error.message);
    return { success: false };
  }
  return { success: true };
}

export async function toggleLikeInPG(userId: string, postId: string): Promise<{ liked: boolean }> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/likes/toggle", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, post_id: postId }),
    });
    if (!res.ok) return { liked: false };
    return res.json();
  } catch {
    return { liked: false };
  }
}

export interface BackendComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  body: string;
  like_count: number;
  created_at: string;
}

export async function fetchComments(postId: string): Promise<BackendComment[]> {
  try {
    const base = getApiUrl();
    const url = new URL(`/api/comments/${encodeURIComponent(postId)}`, base);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return data.comments ?? [];
  } catch {
    return [];
  }
}

export async function addComment(params: {
  post_id: string;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  body: string;
}): Promise<BackendComment | null> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/comments", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function recordShare(params: {
  post_id: string;
  sender_id: string;
  share_type: "internal" | "copy_link" | "system";
  recipient_id?: string | null;
}): Promise<boolean> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/shares", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function reportPost(params: {
  post_id: string;
  user_id: string;
  reason?: string;
}): Promise<boolean> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/reports", base);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCommentsForPost(postId: string): Promise<CommentData[]> {
  const backendComments = await fetchComments(postId);
  return backendComments.map((c) => ({
    id: c.id,
    username: c.username,
    avatarLetter: c.username[0]?.toUpperCase() ?? "U",
    profilePicture: c.avatar_url,
    text: c.body,
    timeAgo: formatTimeAgo(c.created_at),
    likes: c.like_count,
    liked: false,
  }));
}

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWeek = Math.floor(diffDay / 7);
  return `${diffWeek}w`;
}

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export function avatarLetter(user: User): string {
  return user.username ? user.username[0].toUpperCase() : "U";
}
