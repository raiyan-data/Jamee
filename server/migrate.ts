import pg from "pg";
const { Pool } = pg;

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS masjids (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO masjids (id, name, city, country)
VALUES
  ('m1', 'Masjid Al-Haram', 'Mecca', 'Saudi Arabia'),
  ('m2', 'Al-Masjid an-Nabawi', 'Medina', 'Saudi Arabia'),
  ('m3', 'Al-Aqsa Mosque', 'Jerusalem', 'Palestine'),
  ('m4', 'Islamic Center of America', 'Dearborn', 'United States'),
  ('m5', 'East London Mosque', 'London', 'United Kingdom'),
  ('m6', 'Istiqlal Mosque', 'Jakarta', 'Indonesia'),
  ('m7', 'Sultan Ahmed Mosque', 'Istanbul', 'Turkey'),
  ('m8', 'Hassan II Mosque', 'Casablanca', 'Morocco'),
  ('m9', 'Faisal Mosque', 'Islamabad', 'Pakistan'),
  ('m10', 'Islamic Foundation of Toronto', 'Toronto', 'Canada')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  dm_permission TEXT NOT NULL DEFAULT 'everyone',
  account_visibility TEXT NOT NULL DEFAULT 'public',
  restrict_mode BOOLEAN NOT NULL DEFAULT false,
  hide_like_counts BOOLEAN NOT NULL DEFAULT false,
  chronological_feed BOOLEAN NOT NULL DEFAULT false,
  no_music_mode BOOLEAN NOT NULL DEFAULT false,
  muted_keywords TEXT[] NOT NULL DEFAULT '{}',
  notify_likes BOOLEAN NOT NULL DEFAULT true,
  notify_comments BOOLEAN NOT NULL DEFAULT true,
  notify_follows BOOLEAN NOT NULL DEFAULT true,
  notify_masjid BOOLEAN NOT NULL DEFAULT true,
  notify_reminders BOOLEAN NOT NULL DEFAULT true,
  appearance TEXT NOT NULL DEFAULT 'system',
  daily_limit_minutes INTEGER NOT NULL DEFAULT 60,
  reminder_nudges BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT,
  actor_username TEXT,
  actor_avatar TEXT,
  post_id TEXT,
  post_caption TEXT,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT NOT NULL DEFAULT '',
  story_type TEXT NOT NULL DEFAULT 'personal',
  bg_color TEXT,
  ameen_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, expires_at);

CREATE TABLE IF NOT EXISTS story_ameen (
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  age_group TEXT NOT NULL DEFAULT '',
  intentions TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  followers_count INTEGER NOT NULL DEFAULT 1247,
  following_count INTEGER NOT NULL DEFAULT 342,
  posts_count INTEGER NOT NULL DEFAULT 48,
  show_followers BOOLEAN NOT NULL DEFAULT true,
  saved_posts TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS local_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  caption TEXT NOT NULL,
  media_url TEXT,
  audience TEXT NOT NULL DEFAULT 'public',
  is_dua BOOLEAN NOT NULL DEFAULT false,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_posts_created ON local_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS habit_completions (
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  fajr BOOLEAN NOT NULL DEFAULT false,
  dhuhr BOOLEAN NOT NULL DEFAULT false,
  asr BOOLEAN NOT NULL DEFAULT false,
  maghrib BOOLEAN NOT NULL DEFAULT false,
  isha BOOLEAN NOT NULL DEFAULT false,
  morning_adhkar BOOLEAN NOT NULL DEFAULT false,
  evening_adhkar BOOLEAN NOT NULL DEFAULT false,
  sunnah_prayer BOOLEAN NOT NULL DEFAULT false,
  quran_pages INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
`;

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[migrate] DATABASE_URL not set, skipping migrations");
    return;
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query(MIGRATION_SQL);
    console.log("[migrate] Masjids migration completed successfully");
  } catch (err: any) {
    console.error("[migrate] Migration error:", err.message);
  } finally {
    await pool.end();
  }
}
