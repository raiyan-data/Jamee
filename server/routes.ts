import type { Express } from "express";
import { createServer, type Server } from "node:http";
import pg from "pg";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
const { Pool } = pg;

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let pool: InstanceType<typeof Pool> | null = null;

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

async function setupTables(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      body TEXT NOT NULL,
      like_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shared_posts (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      recipient_id TEXT,
      share_type TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS post_reports (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_shared_posts_post_id ON shared_posts(post_id);
  `);
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupTables().catch((err) => console.error("DB setup error:", err));

  app.get("/api/masjids", async (_req, res) => {
    try {
      const result = await getPool().query("SELECT id, name, city, country FROM masjids ORDER BY name ASC");
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/likes/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getPool().query(
        "SELECT post_id FROM post_likes WHERE user_id = $1",
        [userId]
      );
      res.json({ liked_post_ids: result.rows.map((r) => r.post_id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/likes/toggle", async (req, res) => {
    try {
      const { user_id, post_id } = req.body;
      if (!user_id || !post_id) return res.status(400).json({ error: "user_id and post_id required" });

      const existing = await getPool().query(
        "SELECT 1 FROM post_likes WHERE user_id=$1 AND post_id=$2",
        [user_id, post_id]
      );

      if (existing.rows.length > 0) {
        await getPool().query("DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2", [user_id, post_id]);
        res.json({ liked: false });
      } else {
        await getPool().query(
          "INSERT INTO post_likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [user_id, post_id]
        );
        res.json({ liked: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/comments/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 100);
      const result = await getPool().query(
        "SELECT * FROM comments WHERE post_id=$1 ORDER BY created_at DESC LIMIT $2",
        [postId, limit]
      );
      res.json({ comments: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const { post_id, user_id, username, avatar_url, body } = req.body;
      if (!post_id || !user_id || !username || !body) {
        return res.status(400).json({ error: "post_id, user_id, username, body required" });
      }
      if (body.length > 1000) return res.status(400).json({ error: "Comment too long" });

      const id = `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await getPool().query(
        `INSERT INTO comments (id, post_id, user_id, username, avatar_url, body)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, post_id, user_id, username, avatar_url ?? null, body.trim()]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/shares", async (req, res) => {
    try {
      const { post_id, sender_id, recipient_id, share_type } = req.body;
      if (!post_id || !sender_id || !share_type) {
        return res.status(400).json({ error: "post_id, sender_id, share_type required" });
      }
      const VALID_TYPES = ["internal", "copy_link", "system"];
      if (!VALID_TYPES.includes(share_type)) return res.status(400).json({ error: "Invalid share_type" });

      const id = `sh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await getPool().query(
        "INSERT INTO shared_posts (id, post_id, sender_id, recipient_id, share_type) VALUES ($1,$2,$3,$4,$5)",
        [id, post_id, sender_id, recipient_id ?? null, share_type]
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const { post_id, user_id, reason } = req.body;
      if (!post_id || !user_id) return res.status(400).json({ error: "post_id and user_id required" });

      const id = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await getPool().query(
        "INSERT INTO post_reports (id, post_id, user_id, reason) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [id, post_id, user_id, reason ?? null]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/settings/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getPool().query("SELECT * FROM user_settings WHERE user_id = $1", [userId]);
      if (result.rows.length === 0) {
        await getPool().query("INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
        const fresh = await getPool().query("SELECT * FROM user_settings WHERE user_id = $1", [userId]);
        res.json(fresh.rows[0]);
      } else {
        res.json(result.rows[0]);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/settings/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const VALID_ENUMS: Record<string, string[]> = {
        dm_permission: ["everyone", "same_gender", "mutual_followers"],
        account_visibility: ["public", "private"],
        appearance: ["light", "dark", "system"],
      };
      const BOOL_FIELDS = [
        "restrict_mode", "hide_like_counts", "chronological_feed",
        "no_music_mode", "notify_likes", "notify_comments",
        "notify_follows", "notify_masjid", "notify_reminders", "reminder_nudges",
      ];

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, validValues] of Object.entries(VALID_ENUMS)) {
        if (req.body[key] !== undefined) {
          if (!validValues.includes(req.body[key])) {
            return res.status(400).json({ error: `Invalid value for ${key}` });
          }
          updates.push(`${key} = $${idx}`);
          values.push(req.body[key]);
          idx++;
        }
      }

      for (const key of BOOL_FIELDS) {
        if (req.body[key] !== undefined) {
          if (typeof req.body[key] !== "boolean") {
            return res.status(400).json({ error: `${key} must be a boolean` });
          }
          updates.push(`${key} = $${idx}`);
          values.push(req.body[key]);
          idx++;
        }
      }

      if (req.body.daily_limit_minutes !== undefined) {
        const val = req.body.daily_limit_minutes;
        if (typeof val !== "number" || val < 15 || val > 180 || !Number.isInteger(val)) {
          return res.status(400).json({ error: "daily_limit_minutes must be an integer between 15 and 180" });
        }
        updates.push(`daily_limit_minutes = $${idx}`);
        values.push(val);
        idx++;
      }

      if (req.body.muted_keywords !== undefined) {
        const kw = req.body.muted_keywords;
        if (!Array.isArray(kw) || kw.length > 50 || kw.some((k: any) => typeof k !== "string" || k.length > 100)) {
          return res.status(400).json({ error: "muted_keywords must be an array of up to 50 strings (max 100 chars each)" });
        }
        updates.push(`muted_keywords = $${idx}`);
        values.push(kw);
        idx++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      updates.push(`updated_at = now()`);
      values.push(userId);

      const sql = `UPDATE user_settings SET ${updates.join(", ")} WHERE user_id = $${idx} RETURNING *`;
      const result = await getPool().query(sql, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const VALID_NOTIF_TYPES = ["like", "comment", "follow", "masjid_announcement"];

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 50);
      const offset = parseInt((req.query.offset as string) ?? "0", 10);

      const [countResult, rows] = await Promise.all([
        getPool().query("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false", [userId]),
        getPool().query(
          "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
          [userId, limit, offset]
        ),
      ]);

      res.json({
        notifications: rows.rows,
        unread_count: parseInt(countResult.rows[0].count, 10),
        has_more: rows.rows.length === limit,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const { user_id, type, actor_id, actor_username, actor_avatar, post_id, post_caption, message } = req.body;
      if (!user_id || !type) return res.status(400).json({ error: "user_id and type required" });
      if (!VALID_NOTIF_TYPES.includes(type)) return res.status(400).json({ error: "Invalid type" });
      if (user_id === actor_id) return res.json({ skipped: true });

      const id = `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await getPool().query(
        `INSERT INTO notifications (id, user_id, type, actor_id, actor_username, actor_avatar, post_id, post_caption, message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, user_id, type, actor_id ?? null, actor_username ?? null, actor_avatar ?? null,
         post_id ?? null, post_caption ? post_caption.substring(0, 120) : null, message ?? null]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/notifications/:userId/read-all", async (req, res) => {
    try {
      const { userId } = req.params;
      await getPool().query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await getPool().query(
        "UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/push-token", async (req, res) => {
    try {
      const { user_id, token, platform } = req.body;
      if (!user_id || !token) return res.status(400).json({ error: "user_id and token required" });
      await getPool().query(
        `INSERT INTO push_tokens (user_id, token, platform, updated_at)
         VALUES ($1,$2,$3,now())
         ON CONFLICT (user_id) DO UPDATE SET token=$2, platform=$3, updated_at=now()`,
        [user_id, token, platform ?? "unknown"]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getPool().query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
      if (result.rows.length === 0) {
        await getPool().query("INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId]);
        const fresh = await getPool().query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
        res.json(fresh.rows[0]);
      } else {
        res.json(result.rows[0]);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const allowed: Record<string, "text" | "bool" | "int" | "arr"> = {
        display_name: "text", bio: "text", location: "text",
        gender: "text", age_group: "text", intentions: "text",
        avatar_url: "text", show_followers: "bool",
        followers_count: "int", following_count: "int", posts_count: "int",
        saved_posts: "arr",
      };
      const VALID_GENDERS = ["male", "female", "prefer_not_to_say", ""];
      const VALID_AGE_GROUPS = ["13-17", "18-24", "25-34", "35-44", "45+", ""];

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const [key, type] of Object.entries(allowed)) {
        if (req.body[key] === undefined) continue;
        const val = req.body[key];

        if (key === "gender" && !VALID_GENDERS.includes(val)) return res.status(400).json({ error: "Invalid gender" });
        if (key === "age_group" && !VALID_AGE_GROUPS.includes(val)) return res.status(400).json({ error: "Invalid age_group" });

        if (type === "text" && typeof val !== "string") return res.status(400).json({ error: `${key} must be a string` });
        if (type === "bool" && typeof val !== "boolean") return res.status(400).json({ error: `${key} must be a boolean` });
        if (type === "int" && (typeof val !== "number" || !Number.isInteger(val))) return res.status(400).json({ error: `${key} must be an integer` });
        if (type === "arr" && !Array.isArray(val)) return res.status(400).json({ error: `${key} must be an array` });

        updates.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }

      if (updates.length === 0) return res.status(400).json({ error: "No valid fields" });
      updates.push(`updated_at = now()`);
      values.push(userId);

      const sql = `UPDATE user_profiles SET ${updates.join(", ")} WHERE user_id = $${idx} RETURNING *`;
      const result = await getPool().query(sql, values);
      if (result.rows.length === 0) return res.status(404).json({ error: "Profile not found" });
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/stories", async (req, res) => {
    try {
      const viewerId = (req.query.viewer_id as string) ?? "";
      const result = await getPool().query(
        `SELECT s.*,
          CASE WHEN sa.user_id IS NOT NULL THEN true ELSE false END as has_ameened,
          CASE WHEN sv.viewer_id IS NOT NULL THEN true ELSE false END as is_seen
         FROM stories s
         LEFT JOIN story_ameen sa ON sa.story_id = s.id AND sa.user_id = $1
         LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.viewer_id = $1
         WHERE s.expires_at > NOW()
         ORDER BY s.user_id, s.created_at ASC`,
        [viewerId]
      );

      const groupMap = new Map<string, any>();
      for (const row of result.rows) {
        const key = row.user_id;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            user_id: row.user_id,
            username: row.username,
            avatar_url: row.avatar_url,
            stories: [],
            has_unseen: false,
          });
        }
        const group = groupMap.get(key);
        if (!row.is_seen) group.has_unseen = true;
        group.stories.push(row);
      }

      res.json({ groups: Array.from(groupMap.values()) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stories", async (req, res) => {
    try {
      const { user_id, username, avatar_url, media_url, media_type, caption, story_type, bg_color } = req.body;
      if (!user_id || !username) return res.status(400).json({ error: "user_id and username required" });
      const validTypes = ["image", "video", "text"];
      if (media_type && !validTypes.includes(media_type)) return res.status(400).json({ error: "Invalid media_type" });

      const id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const result = await getPool().query(
        `INSERT INTO stories (id, user_id, username, avatar_url, media_url, media_type, caption, story_type, bg_color, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [id, user_id, username, avatar_url ?? null, media_url ?? null,
         media_type ?? "text", caption ?? "", story_type ?? "personal",
         bg_color ?? null, expiresAt]
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stories/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const { viewer_id } = req.body;
      if (!viewer_id) return res.status(400).json({ error: "viewer_id required" });
      await getPool().query(
        `INSERT INTO story_views (story_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, viewer_id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stories/:id/ameen", async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: "user_id required" });

      const existing = await getPool().query(
        `SELECT 1 FROM story_ameen WHERE story_id=$1 AND user_id=$2`, [id, user_id]
      );
      if (existing.rows.length > 0) {
        await getPool().query(`DELETE FROM story_ameen WHERE story_id=$1 AND user_id=$2`, [id, user_id]);
        await getPool().query(`UPDATE stories SET ameen_count = GREATEST(0, ameen_count - 1) WHERE id=$1`, [id]);
        res.json({ ameened: false });
      } else {
        await getPool().query(
          `INSERT INTO story_ameen (story_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, user_id]
        );
        await getPool().query(`UPDATE stories SET ameen_count = ameen_count + 1 WHERE id=$1`, [id]);
        res.json({ ameened: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/stories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;
      const result = await getPool().query(
        `DELETE FROM stories WHERE id=$1 AND user_id=$2 RETURNING id`, [id, user_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Story not found or not owned" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/prayer-times", async (req, res) => {
    const city = (req.query.city as string) || "Mecca";
    const country = (req.query.country as string) || "SA";
    const method = (req.query.method as string) || "2";

    function getFallbackTimes() {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const gregorian = { date: now.toLocaleDateString("en-GB"), format: "DD-MM-YYYY", day: String(now.getDate()).padStart(2, "0"), month: String(now.getMonth() + 1).padStart(2, "0"), year: String(now.getFullYear()), designation: { abbreviated: "AD", expanded: "Anno Domini" } };
      return {
        code: 200,
        status: "OK",
        data: {
          timings: { Fajr: "05:23", Sunrise: "06:45", Dhuhr: "12:15", Asr: "15:30", Sunset: "18:01", Maghrib: "18:01", Isha: "19:30", Imsak: "05:13", Midnight: "00:15", Firstthird: "22:10", Lastthird: "02:20" },
          date: { readable: dateStr, timestamp: String(Math.floor(Date.now() / 1000)), gregorian },
          meta: { latitude: 21.3891, longitude: 39.8579, timezone: "Asia/Riyadh", method: { id: 4, name: "Umm Al-Qura University, Makkah" }, latitudeAdjustmentMethod: "ANGLE_BASED", midnightMode: "STANDARD", school: "STANDARD", offset: {} },
        },
      };
    }

    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
      const data = await new Promise<any>((resolve, reject) => {
        const req2 = https.get(url, (r) => {
          let body = "";
          r.on("data", (chunk) => (body += chunk));
          r.on("end", () => {
            try { resolve(JSON.parse(body)); }
            catch { reject(new Error("Invalid JSON from Aladhan")); }
          });
        });
        req2.on("error", reject);
        req2.setTimeout(5000, () => { req2.destroy(); reject(new Error("timeout")); });
      });
      res.json(data);
    } catch {
      res.json(getFallbackTimes());
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const { user_id, username, avatar_url, caption, media_url, audience, is_dua } = req.body;
      if (!user_id || !username || !caption) {
        return res.status(400).json({ error: "user_id, username, and caption are required" });
      }
      if (caption.length > 2000) return res.status(400).json({ error: "Caption too long" });

      const VALID_AUDIENCE = ["public", "sisters", "brothers", "private"];
      if (audience && !VALID_AUDIENCE.includes(audience)) {
        return res.status(400).json({ error: "Invalid audience" });
      }

      const id = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const result = await getPool().query(
        `INSERT INTO local_posts (id, user_id, username, avatar_url, caption, media_url, audience, is_dua)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [id, user_id, username, avatar_url ?? null, caption.trim(),
         media_url ?? null, audience ?? "public", is_dua ?? false]
      );

      await getPool().query(
        `UPDATE user_profiles SET posts_count = posts_count + 1 WHERE user_id = $1`,
        [user_id]
      );

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/posts/local", async (req, res) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 100);
      const result = await getPool().query(
        "SELECT * FROM local_posts ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      res.json({ posts: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/habits/:userId/:date", async (req, res) => {
    try {
      const { userId, date } = req.params;
      const result = await getPool().query(
        "SELECT * FROM habit_completions WHERE user_id=$1 AND date=$2",
        [userId, date]
      );
      if (result.rows.length === 0) {
        res.json({ user_id: userId, date, fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, morning_adhkar: false, evening_adhkar: false, sunnah_prayer: false, quran_pages: 0 });
      } else {
        res.json(result.rows[0]);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/habits/:userId/:date", async (req, res) => {
    try {
      const { userId, date } = req.params;
      const BOOL_HABITS = ["fajr", "dhuhr", "asr", "maghrib", "isha", "morning_adhkar", "evening_adhkar", "sunnah_prayer"];

      const sets: string[] = [];
      const vals: any[] = [userId, date];
      let idx = 3;

      for (const key of BOOL_HABITS) {
        if (req.body[key] !== undefined) {
          if (typeof req.body[key] !== "boolean") return res.status(400).json({ error: `${key} must be boolean` });
          sets.push(`${key} = $${idx}`);
          vals.push(req.body[key]);
          idx++;
        }
      }

      if (req.body.quran_pages !== undefined) {
        const qp = req.body.quran_pages;
        if (typeof qp !== "number" || qp < 0 || !Number.isInteger(qp)) return res.status(400).json({ error: "quran_pages must be a non-negative integer" });
        sets.push(`quran_pages = $${idx}`);
        vals.push(qp);
        idx++;
      }

      if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
      sets.push(`updated_at = now()`);

      const sql = `
        INSERT INTO habit_completions (user_id, date, ${BOOL_HABITS.join(", ")}, quran_pages)
        VALUES ($1, $2, false, false, false, false, false, false, false, false, 0)
        ON CONFLICT (user_id, date) DO UPDATE SET ${sets.join(", ")}
        RETURNING *`;

      const result = await getPool().query(sql, vals);
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/habits/:userId/week", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getPool().query(
        `SELECT * FROM habit_completions WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '6 days' ORDER BY date ASC`,
        [userId]
      );
      res.json({ week: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/habits/:userId/month", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await getPool().query(
        `SELECT * FROM habit_completions WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '27 days' ORDER BY date ASC`,
        [userId]
      );
      res.json({ month: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const { data: base64Data, mimeType, filename } = req.body;
      if (!base64Data) return res.status(400).json({ error: "data is required" });

      const stripped = base64Data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(stripped, "base64");

      if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: "File too large (max 10MB)" });

      const ext = (mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg");
      const name = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, name);
      fs.writeFileSync(filePath, buffer);

      const host = req.get("host") ?? "";
      const protocol = req.header("x-forwarded-proto") || "https";
      const url = `${protocol}://${host}/uploads/${name}`;

      res.json({ url, filename: name });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
