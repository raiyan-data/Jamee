import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { useApp } from "@/contexts/AppContext";
import type { StoryGroup } from "@/types/models";

const DEMO_STORIES = [
  {
    user_id: "u1",
    username: "abdulrahman",
    avatar_url: "https://i.pravatar.cc/150?u=abdulrahman",
    media_url: "https://images.unsplash.com/photo-1519817650390-64a93db51571?w=600&h=1000&fit=crop",
    media_type: "image",
    caption: "SubhanAllah, the beauty of this creation reminds us of the Creator. 🌿",
    story_type: "personal",
    bg_color: null,
  },
  {
    user_id: "u2",
    username: "fatima.writes",
    avatar_url: "https://i.pravatar.cc/150?u=fatima",
    media_url: null,
    media_type: "text",
    caption: "🤲  Morning reminder: Begin every task with Bismillah. It brings barakah to all that you do.",
    story_type: "reminder",
    bg_color: "#0D7C4A",
  },
  {
    user_id: "u3",
    username: "islamic.wisdom",
    avatar_url: "https://i.pravatar.cc/150?u=wisdom",
    media_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&h=1000&fit=crop",
    media_type: "image",
    caption: "The heart finds peace only in the remembrance of Allah. — Quran 13:28",
    story_type: "personal",
    bg_color: null,
  },
  {
    user_id: "u5",
    username: "omar.dev",
    avatar_url: "https://i.pravatar.cc/150?u=omar",
    media_url: null,
    media_type: "text",
    caption: "📣  Free Quran recitation workshop this Saturday at 10 AM. All levels welcome. DM to register.",
    story_type: "announcement",
    bg_color: "#1B4F72",
  },
  {
    user_id: "u6",
    username: "quran.daily",
    avatar_url: "https://i.pravatar.cc/150?u=quran",
    media_url: null,
    media_type: "text",
    caption: "Ayah of the day:\n\n'And He is with you wherever you are.' — Quran 57:4",
    story_type: "reminder",
    bg_color: "#512E5F",
  },
];

const STORY_QUERY_KEY = "/api/stories";

async function fetchAndSeedStories(viewerId: string): Promise<StoryGroup[]> {
  const base = getApiUrl();
  const url = new URL("/api/stories", base);
  url.searchParams.set("viewer_id", viewerId);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  const groups: StoryGroup[] = data.groups ?? [];

  if (groups.length === 0) {
    const postUrl = new URL("/api/stories", base).toString();
    for (const demo of DEMO_STORIES) {
      try {
        await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(demo),
        });
      } catch {}
    }
    const res2 = await fetch(url.toString());
    if (res2.ok) {
      const data2 = await res2.json();
      return data2.groups ?? [];
    }
  }
  return groups;
}

export function useStories() {
  const { currentUserId } = useApp();

  return useQuery<StoryGroup[]>({
    queryKey: [STORY_QUERY_KEY, currentUserId],
    queryFn: () => fetchAndSeedStories(currentUserId ?? ""),
    enabled: !!currentUserId,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useInvalidateStories() {
  const queryClient = useQueryClient();
  const { currentUserId } = useApp();
  return () => queryClient.invalidateQueries({ queryKey: [STORY_QUERY_KEY, currentUserId] });
}
