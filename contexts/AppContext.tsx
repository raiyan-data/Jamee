import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type PrayerName, PRAYER_NAMES, type Masjid, type UserProfile, DEFAULT_PROFILE, type GenderType, type AgeGroup } from "@/types/models";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import { apiRequest } from "@/lib/query-client";

interface PrayerStatus {
  [key: string]: boolean;
}

interface SunnahHabits {
  morningAdhkar: boolean;
  eveningAdhkar: boolean;
  sunnahPrayer: boolean;
}

interface AppState {
  isLoggedIn: boolean;
  isHydrated: boolean;
  currentUserId: string | null;
  username: string;
  displayName: string;
  bio: string;
  avatarLetter: string;
  avatarUri: string;
  location: string;
  gender: GenderType;
  ageGroup: AgeGroup;
  intentions: string;
  followers: number;
  following: number;
  posts: number;
  showFollowers: boolean;
  savedPosts: Set<string>;
  prayerStreak: number;
  quranProgress: number;
  todayPrayers: PrayerStatus;
  sunnahHabits: SunnahHabits;
  likedPosts: Set<string>;
  masjid: Masjid | null;
  setMasjid: (masjid: Masjid | null) => void;
  login: (username: string) => void;
  logout: () => void;
  togglePrayer: (prayer: PrayerName) => void;
  toggleSunnahHabit: (habit: keyof SunnahHabits) => void;
  toggleLike: (postId: string) => boolean;
  toggleSavePost: (postId: string) => void;
  updateQuranProgress: (progress: number) => void;
  updateProfile: (fields: Partial<Pick<AppState, "username" | "displayName" | "bio" | "location" | "gender" | "ageGroup" | "intentions" | "avatarUri" | "showFollowers">>) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEYS = {
  USER: "@ummah_user",
  PRAYERS: "@ummah_prayers",
  STREAK: "@ummah_streak",
  QURAN: "@ummah_quran",
  LIKES: "@ummah_likes",
  MASJID: "@ummah_masjid",
  SAVED: "@ummah_saved",
  SUNNAH: "@ummah_sunnah",
};

const DEFAULT_SUNNAH: SunnahHabits = { morningAdhkar: false, eveningAdhkar: false, sunnahPrayer: false };

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function persistHabitsToApi(
  userId: string,
  prayers: PrayerStatus,
  sunnah: SunnahHabits,
  quranPages: number,
  baseUrl: string
): Promise<void> {
  try {
    const date = getTodayDate();
    const url = new URL(`/api/habits/${userId}/${date}`, baseUrl);
    await fetch(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fajr: !!prayers["Fajr"],
        dhuhr: !!prayers["Dhuhr"],
        asr: !!prayers["Asr"],
        maghrib: !!prayers["Maghrib"],
        isha: !!prayers["Isha"],
        morning_adhkar: sunnah.morningAdhkar,
        evening_adhkar: sunnah.eveningAdhkar,
        sunnah_prayer: sunnah.sunnahPrayer,
        quran_pages: quranPages,
      }),
    });
  } catch {
    // silently fail
  }
}

function mapRowToProfile(row: any, userId: string): Partial<AppState> {
  return {
    displayName: row.display_name || "",
    bio: row.bio || "",
    location: row.location || "",
    gender: (row.gender || "") as GenderType,
    ageGroup: (row.age_group || "") as AgeGroup,
    intentions: row.intentions || "",
    avatarUri: row.avatar_url || "",
    followers: row.followers_count ?? 1247,
    following: row.following_count ?? 342,
    posts: row.posts_count ?? 48,
    showFollowers: row.show_followers ?? true,
    savedPosts: new Set<string>(Array.isArray(row.saved_posts) ? row.saved_posts : []),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("Striving to be a better version of myself every day.");
  const [avatarUri, setAvatarUri] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<GenderType>("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("");
  const [intentions, setIntentions] = useState("");
  const [followers, setFollowers] = useState(1247);
  const [following, setFollowing] = useState(342);
  const [posts, setPosts] = useState(48);
  const [showFollowers, setShowFollowers] = useState(true);
  const [todayPrayers, setTodayPrayers] = useState<PrayerStatus>({});
  const [prayerStreak, setPrayerStreak] = useState(0);
  const [quranProgress, setQuranProgress] = useState(0);
  const [sunnahHabits, setSunnahHabits] = useState<SunnahHabits>(DEFAULT_SUNNAH);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [masjid, setMasjidState] = useState<Masjid | null>(null);
  const [streakIncrementedToday, setStreakIncrementedToday] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [userData, prayerData, streakData, quranData, likesData, masjidData, savedData, sunnahData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.PRAYERS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK),
        AsyncStorage.getItem(STORAGE_KEYS.QURAN),
        AsyncStorage.getItem(STORAGE_KEYS.LIKES),
        AsyncStorage.getItem(STORAGE_KEYS.MASJID),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED),
        AsyncStorage.getItem(STORAGE_KEYS.SUNNAH),
      ]);

      if (userData) {
        const user = JSON.parse(userData);
        const userId = user.id ?? null;
        setCurrentUserId(userId);
        setUsername(user.username);
        setDisplayName(user.displayName || user.username);
        if (user.bio) setBio(user.bio);
        if (user.avatarUri) setAvatarUri(user.avatarUri);
        if (user.location) setLocation(user.location);
        if (user.gender) setGender(user.gender);
        if (user.ageGroup) setAgeGroup(user.ageGroup);
        if (user.intentions) setIntentions(user.intentions);
        if (user.showFollowers !== undefined) setShowFollowers(user.showFollowers);
        setIsLoggedIn(true);

        if (userId) {
          fetchProfileFromApi(userId);
        }
      }
      if (prayerData) setTodayPrayers(JSON.parse(prayerData));
      if (streakData) setPrayerStreak(parseInt(streakData, 10));
      if (quranData) setQuranProgress(parseFloat(quranData));
      if (likesData) setLikedPosts(new Set(JSON.parse(likesData)));
      if (masjidData) setMasjidState(JSON.parse(masjidData));
      if (savedData) setSavedPosts(new Set(JSON.parse(savedData)));
      if (sunnahData) setSunnahHabits(JSON.parse(sunnahData));
    } catch (e) {
      console.error("Failed to load stored data:", e);
    } finally {
      setIsHydrated(true);
    }
  };

  const fetchProfileFromApi = async (userId: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/profile/${userId}`, baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const mapped = mapRowToProfile(data, userId);
      if (mapped.displayName) setDisplayName(mapped.displayName);
      if (mapped.bio) setBio(mapped.bio);
      if (mapped.location !== undefined) setLocation(mapped.location as string);
      if (mapped.gender !== undefined) setGender(mapped.gender as GenderType);
      if (mapped.ageGroup !== undefined) setAgeGroup(mapped.ageGroup as AgeGroup);
      if (mapped.intentions !== undefined) setIntentions(mapped.intentions as string);
      if (mapped.avatarUri) setAvatarUri(mapped.avatarUri as string);
      if (mapped.followers !== undefined) setFollowers(mapped.followers as number);
      if (mapped.following !== undefined) setFollowing(mapped.following as number);
      if (mapped.posts !== undefined) setPosts(mapped.posts as number);
      if (mapped.showFollowers !== undefined) setShowFollowers(mapped.showFollowers as boolean);
      if (mapped.savedPosts) setSavedPosts(mapped.savedPosts as Set<string>);
    } catch (e) {
      // silently fail — local state already loaded
    }
  };

  const login = useCallback(async (name: string) => {
    const userId = `local_${Date.now()}`;
    setCurrentUserId(userId);
    setUsername(name);
    setDisplayName(name);
    setIsLoggedIn(true);
    setPrayerStreak(7);
    setQuranProgress(0.35);
    const initialPrayers: PrayerStatus = {};
    PRAYER_NAMES.forEach((p) => { initialPrayers[p] = false; });
    setTodayPrayers(initialPrayers);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: userId, username: name, displayName: name }));
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK, "7");
      await AsyncStorage.setItem(STORAGE_KEYS.QURAN, "0.35");
      await AsyncStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(initialPrayers));
    } catch (e) {
      console.error("Failed to save user data:", e);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    setCurrentUserId(null);
    setUsername("");
    setDisplayName("");
    setBio("Striving to be a better version of myself every day.");
    setAvatarUri("");
    setLocation("");
    setGender("");
    setAgeGroup("");
    setIntentions("");
    setMasjidState(null);
    setSavedPosts(new Set());
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (e) {
      console.error("Failed to clear data:", e);
    }
  }, []);

  const updateProfile = useCallback(async (fields: Partial<Pick<AppState, "username" | "displayName" | "bio" | "location" | "gender" | "ageGroup" | "intentions" | "avatarUri" | "showFollowers">>) => {
    if (fields.username !== undefined) setUsername(fields.username);
    if (fields.displayName !== undefined) setDisplayName(fields.displayName);
    if (fields.bio !== undefined) setBio(fields.bio);
    if (fields.location !== undefined) setLocation(fields.location);
    if (fields.gender !== undefined) setGender(fields.gender as GenderType);
    if (fields.ageGroup !== undefined) setAgeGroup(fields.ageGroup as AgeGroup);
    if (fields.intentions !== undefined) setIntentions(fields.intentions);
    if (fields.avatarUri !== undefined) setAvatarUri(fields.avatarUri);
    if (fields.showFollowers !== undefined) setShowFollowers(fields.showFollowers);

    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    const existing = userStr ? JSON.parse(userStr) : {};
    const updated = {
      ...existing,
      username: fields.username ?? existing.username,
      displayName: fields.displayName ?? existing.displayName,
      bio: fields.bio ?? existing.bio,
      avatarUri: fields.avatarUri ?? existing.avatarUri,
      location: fields.location ?? existing.location,
      gender: fields.gender ?? existing.gender,
      ageGroup: fields.ageGroup ?? existing.ageGroup,
      intentions: fields.intentions ?? existing.intentions,
      showFollowers: fields.showFollowers ?? existing.showFollowers,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));

    if (currentUserId) {
      const apiFields: Record<string, any> = {};
      if (fields.displayName !== undefined) apiFields.display_name = fields.displayName;
      if (fields.bio !== undefined) apiFields.bio = fields.bio;
      if (fields.location !== undefined) apiFields.location = fields.location;
      if (fields.gender !== undefined) apiFields.gender = fields.gender;
      if (fields.ageGroup !== undefined) apiFields.age_group = fields.ageGroup;
      if (fields.intentions !== undefined) apiFields.intentions = fields.intentions;
      if (fields.avatarUri !== undefined) apiFields.avatar_url = fields.avatarUri;
      if (fields.showFollowers !== undefined) apiFields.show_followers = fields.showFollowers;

      if (Object.keys(apiFields).length > 0) {
        apiRequest("PATCH", `/api/profile/${currentUserId}`, apiFields).catch(() => {});
      }
    }
  }, [currentUserId]);

  const togglePrayer = useCallback((prayer: PrayerName) => {
    setTodayPrayers((prev) => {
      const updated = { ...prev, [prayer]: !prev[prayer] };
      AsyncStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(updated)).catch(() => {});
      const completedCount = Object.values(updated).filter(Boolean).length;
      if (completedCount === PRAYER_NAMES.length && !streakIncrementedToday) {
        setStreakIncrementedToday(true);
        setPrayerStreak((s) => {
          const newStreak = s + 1;
          AsyncStorage.setItem(STORAGE_KEYS.STREAK, String(newStreak)).catch(() => {});
          return newStreak;
        });
      }
      if (currentUserId) {
        setSunnahHabits((sh) => {
          persistHabitsToApi(currentUserId, updated, sh, Math.round(quranProgress * 604), getApiUrl()).catch(() => {});
          return sh;
        });
      }
      return updated;
    });
  }, [streakIncrementedToday, currentUserId, quranProgress]);

  const toggleSunnahHabit = useCallback((habit: keyof SunnahHabits) => {
    setSunnahHabits((prev) => {
      const updated = { ...prev, [habit]: !prev[habit] };
      AsyncStorage.setItem(STORAGE_KEYS.SUNNAH, JSON.stringify(updated)).catch(() => {});
      if (currentUserId) {
        setTodayPrayers((tp) => {
          persistHabitsToApi(currentUserId, tp, updated, Math.round(quranProgress * 604), getApiUrl()).catch(() => {});
          return tp;
        });
      }
      return updated;
    });
  }, [currentUserId, quranProgress]);

  const toggleLike = useCallback((postId: string): boolean => {
    let nowLiked = false;
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); nowLiked = false; }
      else { next.add(postId); nowLiked = true; }
      AsyncStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify([...next])).catch(() => {});
      return next;
    });
    return nowLiked;
  }, []);

  const toggleSavePost = useCallback((postId: string) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      AsyncStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify([...next])).catch(() => {});
      if (currentUserId) {
        apiRequest("PATCH", `/api/profile/${currentUserId}`, { saved_posts: [...next] }).catch(() => {});
      }
      return next;
    });
  }, [currentUserId]);

  const updateQuranProgress = useCallback(async (progress: number) => {
    const clamped = Math.min(1, Math.max(0, progress));
    setQuranProgress(clamped);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.QURAN, String(clamped));
    } catch (e) {
      console.error("Failed to save quran progress:", e);
    }
  }, []);

  const setMasjid = useCallback(async (m: Masjid | null) => {
    setMasjidState(m);
    try {
      if (m) await AsyncStorage.setItem(STORAGE_KEYS.MASJID, JSON.stringify(m));
      else await AsyncStorage.removeItem(STORAGE_KEYS.MASJID);
    } catch (e) {
      console.error("Failed to save masjid:", e);
    }
  }, []);

  const avatarLetter = username ? username[0].toUpperCase() : "U";

  const value = useMemo(
    () => ({
      isLoggedIn, isHydrated, currentUserId,
      username, displayName, bio, avatarLetter, avatarUri,
      location, gender, ageGroup, intentions,
      followers, following, posts, showFollowers,
      prayerStreak, quranProgress, todayPrayers, sunnahHabits,
      likedPosts, savedPosts, masjid,
      setMasjid, login, logout,
      togglePrayer, toggleSunnahHabit, toggleLike, toggleSavePost,
      updateQuranProgress, updateProfile,
    }),
    [isLoggedIn, isHydrated, currentUserId, username, displayName, bio, avatarLetter, avatarUri,
     location, gender, ageGroup, intentions, followers, following, posts, showFollowers,
     prayerStreak, quranProgress, todayPrayers, sunnahHabits, likedPosts, savedPosts, masjid,
     setMasjid, login, logout, togglePrayer, toggleSunnahHabit, toggleLike, toggleSavePost, updateQuranProgress, updateProfile]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
