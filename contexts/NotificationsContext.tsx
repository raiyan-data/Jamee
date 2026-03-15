import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { AppState } from "react-native";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import { useApp } from "@/contexts/AppContext";
import type { AppNotification } from "@/types/models";

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 15000;

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUserId, isLoggedIn } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const seededRef = useRef(false);

  const seedDemoNotifications = useCallback(async (userId: string) => {
    if (seededRef.current) return;
    seededRef.current = true;
    const base = getApiUrl();
    const postUrl = new URL("/api/notifications", base).toString();
    const demos = [
      { user_id: userId, type: "masjid_announcement", message: "Jummah khutbah this Friday at 1:15 PM. All brothers and sisters are welcome.", actor_username: "East London Mosque" },
      { user_id: userId, type: "like", actor_username: "fatima.writes", actor_avatar: "https://i.pravatar.cc/150?u=fatima", post_caption: "The beauty of patience is that it leads to the best outcomes. Trust Allah." },
      { user_id: userId, type: "comment", actor_username: "omar.dev", actor_avatar: "https://i.pravatar.cc/150?u=omar", post_caption: "Gratitude changes everything. Alhamdulillah." },
      { user_id: userId, type: "follow", actor_username: "islamic.wisdom", actor_avatar: "https://i.pravatar.cc/150?u=wisdom" },
      { user_id: userId, type: "like", actor_username: "aisha.creates", actor_avatar: "https://i.pravatar.cc/150?u=aisha", post_caption: "Morning adhkar reminder: Start your day with gratitude." },
      { user_id: userId, type: "comment", actor_username: "quran.daily", actor_avatar: "https://i.pravatar.cc/150?u=quran", post_caption: "The Prophet said: The best of you learn the Quran and teach it." },
      { user_id: userId, type: "follow", actor_username: "halal.chef", actor_avatar: "https://i.pravatar.cc/150?u=chef" },
      { user_id: userId, type: "masjid_announcement", message: "Ramadan prep workshop: Maximising the blessed month. Register online.", actor_username: "East London Mosque" },
    ];

    for (let i = 0; i < demos.length; i++) {
      const d = demos[i];
      const payload: Record<string, any> = { user_id: d.user_id, type: d.type };
      if (d.actor_username) payload.actor_username = d.actor_username;
      if ("actor_avatar" in d && d.actor_avatar) payload.actor_avatar = d.actor_avatar;
      if ("post_caption" in d && d.post_caption) payload.post_caption = d.post_caption;
      if ("message" in d && d.message) payload.message = d.message;
      try {
        await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // silently continue
      }
    }
  }, []);

  const fetchPage = useCallback(async (offset: number, replace: boolean) => {
    if (!currentUserId) return;
    try {
      const base = getApiUrl();
      const url = new URL(`/api/notifications/${currentUserId}`, base);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const items: AppNotification[] = data.notifications ?? [];

      if (offset === 0 && replace && items.length === 0 && !seededRef.current) {
        await seedDemoNotifications(currentUserId);
        const res2 = await fetch(url.toString(), { credentials: "include" });
        if (res2.ok) {
          const data2 = await res2.json();
          setNotifications(data2.notifications ?? []);
          setUnreadCount(data2.unread_count ?? 0);
          setHasMore(!!data2.has_more);
          offsetRef.current = (data2.notifications ?? []).length;
          return;
        }
      }

      setNotifications((prev) => replace ? items : [...prev, ...items]);
      setUnreadCount(data.unread_count ?? 0);
      setHasMore(!!data.has_more);
      offsetRef.current = offset + items.length;
    } catch {
      // silently fail
    }
  }, [currentUserId, seedDemoNotifications]);

  const refresh = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    offsetRef.current = 0;
    await fetchPage(0, true);
    setIsLoading(false);
  }, [currentUserId, fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !currentUserId) return;
    setIsLoadingMore(true);
    await fetchPage(offsetRef.current, false);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, currentUserId, fetchPage]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    apiRequest("PATCH", `/api/notifications/${id}/read`, {}).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    if (currentUserId) {
      apiRequest("PATCH", `/api/notifications/${currentUserId}/read-all`, {}).catch(() => {});
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isLoggedIn && currentUserId) {
      refresh();

      pollingRef.current = setInterval(() => {
        fetchPage(0, true);
      }, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLoggedIn, currentUserId]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isLoggedIn && currentUserId) {
        fetchPage(0, true);
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, currentUserId, fetchPage]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, isLoading, isLoadingMore, hasMore, refresh, loadMore, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
