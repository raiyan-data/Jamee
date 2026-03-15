import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { useApp } from "./AppContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import { type UserSettings, DEFAULT_SETTINGS } from "@/types/models";

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  isSavingKey: (key: keyof UserSettings) => boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  addMutedKeyword: (keyword: string) => Promise<void>;
  removeMutedKeyword: (keyword: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsState | null>(null);

function mapRowToSettings(row: any): UserSettings {
  return {
    user_id: row.user_id,
    dm_permission: row.dm_permission,
    account_visibility: row.account_visibility,
    restrict_mode: row.restrict_mode,
    hide_like_counts: row.hide_like_counts,
    chronological_feed: row.chronological_feed,
    no_music_mode: row.no_music_mode,
    muted_keywords: Array.isArray(row.muted_keywords) ? row.muted_keywords : [],
    notify_likes: row.notify_likes,
    notify_comments: row.notify_comments,
    notify_follows: row.notify_follows,
    notify_masjid: row.notify_masjid,
    notify_reminders: row.notify_reminders,
    appearance: row.appearance,
    daily_limit_minutes: row.daily_limit_minutes,
    reminder_nudges: row.reminder_nudges,
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { currentUserId, isLoggedIn } = useApp();
  const [settings, _setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  const settingsRef = useRef<UserSettings>({ ...DEFAULT_SETTINGS });

  const setSettings = useCallback((updater: UserSettings | ((prev: UserSettings) => UserSettings)) => {
    if (typeof updater === "function") {
      const next = updater(settingsRef.current);
      settingsRef.current = next;
      _setSettings(next);
    } else {
      settingsRef.current = updater;
      _setSettings(updater);
    }
  }, []);

  const fetchSettings = useCallback(async (userId: string): Promise<UserSettings | null> => {
    const url = new URL(`/api/settings/${userId}`, getApiUrl());
    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return mapRowToSettings(data);
  }, []);

  useEffect(() => {
    if (!currentUserId || !isLoggedIn) {
      setSettings({ ...DEFAULT_SETTINGS });
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const loaded = await fetchSettings(currentUserId);
        if (!cancelled && loaded) setSettings(loaded);
      } catch (err) {
        console.error("[Settings] Failed to load:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentUserId, isLoggedIn, fetchSettings, setSettings]);

  const isSavingKey = useCallback((key: keyof UserSettings) => savingKeys.has(key as string), [savingKeys]);

  const markSaving = useCallback((key: string) =>
    setSavingKeys((prev) => new Set([...prev, key])), []);

  const unmarkSaving = useCallback((key: string) =>
    setSavingKeys((prev) => { const n = new Set(prev); n.delete(key); return n; }), []);

  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): Promise<void> => {
    if (!currentUserId) return;
    const previous = settingsRef.current;
    setSettings((prev) => ({ ...prev, [key]: value }));
    markSaving(key as string);
    try {
      const url = new URL(`/api/settings/${currentUserId}`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const refreshed = await fetchSettings(currentUserId);
      if (refreshed) setSettings(refreshed);
    } catch (err) {
      console.error(`[Settings] Failed to save ${key}:`, err);
      setSettings(previous);
    } finally {
      unmarkSaving(key as string);
    }
  }, [currentUserId, fetchSettings, setSettings, markSaving, unmarkSaving]);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>): Promise<void> => {
    if (!currentUserId) return;
    const previous = settingsRef.current;
    setSettings((prev) => ({ ...prev, ...partial }));
    const keys = Object.keys(partial);
    keys.forEach(markSaving);
    try {
      const url = new URL(`/api/settings/${currentUserId}`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const refreshed = await fetchSettings(currentUserId);
      if (refreshed) setSettings(refreshed);
    } catch (err) {
      console.error("[Settings] Failed to save multiple keys:", err);
      setSettings(previous);
    } finally {
      keys.forEach(unmarkSaving);
    }
  }, [currentUserId, fetchSettings, setSettings, markSaving, unmarkSaving]);

  const addMutedKeyword = useCallback(async (keyword: string): Promise<void> => {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed || !currentUserId) return;
    const current = settingsRef.current;
    if (current.muted_keywords.includes(trimmed)) return;
    const updated = [...current.muted_keywords, trimmed];
    await updateSetting("muted_keywords", updated);
  }, [currentUserId, updateSetting]);

  const removeMutedKeyword = useCallback(async (keyword: string): Promise<void> => {
    if (!currentUserId) return;
    const updated = settingsRef.current.muted_keywords.filter((k) => k !== keyword);
    await updateSetting("muted_keywords", updated);
  }, [currentUserId, updateSetting]);

  const value = useMemo(() => ({
    settings,
    isLoading,
    isSavingKey,
    updateSetting,
    updateSettings,
    addMutedKeyword,
    removeMutedKeyword,
  }), [settings, isLoading, isSavingKey, updateSetting, updateSettings, addMutedKeyword, removeMutedKeyword]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
