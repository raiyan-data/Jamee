# Ummah - Muslim Community Social Media App

## Overview
A modern, mobile-first social media application designed for the Muslim community. Built with Expo (React Native) + Express backend. Data layer connects to Supabase when credentials are provided, with local seed data fallback.

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **Backend**: Express.js (port 5000) - serves APIs and landing page
- **Database**: Supabase (PostgreSQL) - `lib/supabase.ts` creates the client; `lib/data.ts` queries Supabase when configured, falls back to seed data otherwise
- **State Management**: React Context (AppContext) + AsyncStorage for user auth/preferences; React Query hooks (`hooks/usePosts.ts`) for data fetching
- **Styling**: React Native StyleSheet with custom theme system (light/dark mode)

## Supabase Integration
- **Client**: `lib/supabase.ts` - creates Supabase client from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Secrets Required**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (forwarded as `EXPO_PUBLIC_*` via the frontend workflow command)
- **Data Functions**: `fetchPosts()`, `fetchPostById()`, `fetchUserById()`, `likePost()`, `unlikePost()` all query Supabase
- **Expected Tables**: `users` (id, username, profile_picture, bio) and `posts` (id, user_id, media_url, caption, like_count, created_at, category)

## Replit PostgreSQL (Local DB)
- **Migration**: `server/migrate.ts` - runs on server startup, creates all tables including `masjids`, `user_settings`, `user_profiles`, `local_posts`, `habit_completions`
- **API**: `GET /api/masjids` - returns list of masjids from local database
- **API**: `GET /api/settings/:userId` - returns user settings (auto-creates with defaults if missing)
- **API**: `PATCH /api/settings/:userId` - updates user settings with server-side validation
- **API**: `GET /api/notifications/:userId?limit=20&offset=0` - paginated notifications with unread count
- **API**: `POST /api/notifications` - create notification (type, actor_id, actor_username, actor_avatar, post_id, post_caption, message)
- **API**: `PATCH /api/notifications/:userId/read-all` - mark all notifications as read
- **API**: `PATCH /api/notifications/:id/read` - mark single notification as read
- **API**: `POST /api/push-token` - register push token for future push notification support
- **API**: `GET /api/stories?viewer_id=xxx` - active stories grouped by user (with has_ameened and is_seen per viewer)
- **API**: `POST /api/stories` - create a story (user_id, username, avatar_url, media_url, media_type, caption, story_type, bg_color)
- **API**: `POST /api/stories/:id/view` - mark story as viewed by viewer_id
- **API**: `POST /api/stories/:id/ameen` - toggle Ameen reaction (adds/removes from story_ameen table, updates count)
- **API**: `DELETE /api/stories/:id` - delete own story (requires user_id in body)
- **API**: `GET /api/profile/:userId` - returns user profile (auto-creates if missing)
- **API**: `PATCH /api/profile/:userId` - updates profile fields (display_name, bio, location, gender, age_group, intentions, avatar_url, show_followers, saved_posts)
- **API**: `GET /api/prayer-times?city=&country=&method=` - proxy to Aladhan API; falls back to Mecca defaults if network unavailable
- **API**: `POST /api/posts` - create a local post (user_id, username, caption, media_url, audience, is_dua)
- **API**: `GET /api/posts/local` - list all local posts newest first (merged into home feed via `fetchPosts()`)
- **API**: `GET /api/habits/:userId/:date` - get habit data for a specific date (returns defaults if missing)
- **API**: `PATCH /api/habits/:userId/:date` - toggle prayers/sunnah habits or update quran_pages for a date
- **API**: `GET /api/habits/:userId/week` - last 7 days of habit completions (for heatmap)
- **API**: `GET /api/habits/:userId/month` - last 28 days of habit completions (for Deen Hub weekly insights)
- **API**: `POST /api/upload` - accepts base64-encoded image, saves to `public/uploads/`, returns URL
- **Masjid Data**: Stored locally (not in Supabase); user's masjid choice persisted in AsyncStorage via AppContext
- **Settings Data**: Stored in `user_settings` table; fetched/persisted via SettingsContext
- **Profile Data**: Stored in `user_profiles` table; synced via AppContext `updateProfile()`
- **Local Posts**: Stored in `local_posts` table; merged with Supabase posts in `fetchPosts()` (newest-first deduped)
- **Habit Data**: Stored in `habit_completions` table (user_id + date PK); AppContext persists via `persistHabitsToApi()`

## Data Models

### `users` table
- `id` (string) - primary key
- `username` (string) - unique display name
- `profile_picture` (string | null) - URL to profile image
- `bio` (string) - user bio text

### `posts` table
- `id` (string) - primary key
- `user_id` (string) - FK to users.id
- `media_url` (string | null) - URL to image/video media
- `caption` (string) - post text content
- `like_count` (number) - cached like count
- `created_at` (string) - ISO 8601 timestamp

### `user_settings` table (Replit PG)
- `user_id` (text PK) - linked to client-side user ID
- `dm_permission` (text) - 'everyone' | 'same_gender' | 'mutual_followers'
- `account_visibility` (text) - 'public' | 'private'
- `restrict_mode` (bool), `hide_like_counts` (bool), `chronological_feed` (bool), `no_music_mode` (bool)
- `muted_keywords` (text[]) - array of muted keyword strings
- `notify_likes`, `notify_comments`, `notify_follows`, `notify_masjid`, `notify_reminders` (bool)
- `appearance` (text) - 'light' | 'dark' | 'system'
- `daily_limit_minutes` (int) - 15 to 180
- `reminder_nudges` (bool)

### Other models
- `Reel` extends Post with `comment_count`, `share_count`, `color`, and embedded `user`
- `Creator` for recommended creators with `follower_count`, `category`
- `ExploreCategory` for discover page categories
- `PrayerName` union type for the 5 daily prayers

## Key Files & Structure

### Data & Types
- `types/models.ts` - All DB-aligned TypeScript interfaces (User, Post, PostWithUser, Reel, Creator, etc.)
- `lib/supabase.ts` - Lazy Supabase client via Proxy; throws at call time if credentials missing (no import-time crash)
- `lib/data.ts` - Async service layer; fetches posts/users from Supabase directly (no seed fallback for posts); reels/creators/categories still use local data
- `hooks/usePosts.ts` - React Query hooks (usePosts, useReels, useCreators, useCategories)
- `lib/query-client.ts` - QueryClient with default API fetcher
- `constants/mockData.ts` - Re-exports types from models.ts for backward compat

### App Routes
- `app/index.tsx` - Auth gate (redirects to login or tabs after hydration)
- `app/login.tsx` - Login/Signup screen
- `app/settings.tsx` - Full settings screen (navigated from profile gear icon)
- `app/reel.tsx` - Full-screen reels viewer (uses VideoPlayer + useReels hook)
- `app/(tabs)/` - Main tab navigation
  - `index.tsx` - Home Feed (usePosts hook, PostCard list, skeleton loading, CommentsSheet modal)
  - `explore.tsx` - Full-screen vertical video feed with category filters (Quran, Reminders, Lifestyle, Learning, Masjid); fetches from Supabase via useVideoPosts
  - `create.tsx` - Create post screen
  - `progress.tsx` - Spiritual tracker (prayers, Quran)
  - `profile.tsx` - User profile

### Reusable Component System (`components/`)
- `PostCard.tsx` - Accepts `PostWithUser` type; renders user avatar (image or letter), media (Image or quote pattern), like/comment/share/bookmark, formatted timestamps
- `Avatar.tsx` - Letter/image avatar with online indicator, border ring, pressable
- `LikeButton.tsx` - Animated like button with burst particles, haptic feedback
- `CommentItem.tsx` - Threaded comment with nested replies, profile pictures, like/reply actions
- `CommentsSheet.tsx` - Modal comments overlay; loads mock comments per post, supports adding comments locally
- `VideoPlayer.tsx` - Full-screen reel; accepts `Reel` type from models
- `ProfileHeader.tsx` - Reusable profile header with stats, badges, masjid badge, follow/edit
- `MasjidSelector.tsx` - Modal bottom sheet for selecting/removing masjid affiliation
- `ProgressRing.tsx` - Animated SVG circular progress; also exports MultiProgressRing
- `PrayerRow.tsx` - Prayer tracking row with animated checkbox
- `MindfulReminder.tsx` - Inline feed reminder encouraging reflection after viewing many posts; animated, dismissible, non-blocking
- `BottomNavigationBar.tsx` - Standalone animated bottom nav with blur/badges
- `index.ts` - Barrel export for all components

### Settings Components (`components/settings/`)
- `SettingsSection.tsx` - Reusable section wrapper with title and card styling
- `SettingsRow.tsx` - Reusable row with icon, label, subtitle, toggle switch, or chevron navigation
- `AccountSection.tsx` - Email, username, password, logout
- `PrivacySection.tsx` - DM permissions modal, account visibility segment, blocked users, restrict mode
- `ContentSection.tsx` - Hide likes, chronological feed, no-music mode, muted keywords with add/remove chips
- `NotificationsSection.tsx` - Toggle switches for likes, comments, follows, masjid, reminders
- `AppearanceSection.tsx` - Light/Dark/System mode cards
- `SpiritualSection.tsx` - Daily usage limit selector, reminder nudges toggle

### State & Config
- `contexts/AppContext.tsx` - App state (auth with currentUserId, prayers, likes, quran progress)
- `contexts/SettingsContext.tsx` - Settings state fetched from API; provides updateSetting, addMutedKeyword, removeMutedKeyword
- `constants/colors.ts` - Theme colors (emerald green primary, soft gold accent)
- `constants/theme.ts` - useTheme hook returning current color set

### Backend
- `server/index.ts` - Express server setup with CORS, runs migrations on startup
- `server/routes.ts` - API routes (`GET /api/masjids`, `GET/PATCH /api/settings/:userId`)
- `server/migrate.ts` - Database migrations (creates `masjids` table in Replit PG)
- `server/storage.ts` - In-memory storage

## Design System
- **Primary**: Emerald green (#0D7C4A light / #2ECC71 dark)
- **Accent**: Soft gold (#C9A84C light / #D4AC5A dark)
- **Font**: Inter (400, 500, 600, 700 weights)
- **Components**: Rounded cards (20px radius), soft shadows, blur tab bar
- **Navigation**: 5-tab bottom nav with liquid glass support (iOS 26+)
