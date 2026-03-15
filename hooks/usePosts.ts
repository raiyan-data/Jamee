import { useQuery } from "@tanstack/react-query";
import { fetchPosts, fetchVideoPosts, fetchReels, fetchCreators, fetchCategories } from "@/lib/data";

export function usePosts() {
  return useQuery({
    queryKey: ["/posts"],
    queryFn: fetchPosts,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useVideoPosts(category?: string) {
  return useQuery({
    queryKey: ["/video-posts", category ?? "all"],
    queryFn: () => fetchVideoPosts(category),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useReels() {
  return useQuery({
    queryKey: ["/reels"],
    queryFn: fetchReels,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreators() {
  return useQuery({
    queryKey: ["/creators"],
    queryFn: fetchCreators,
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["/categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });
}
