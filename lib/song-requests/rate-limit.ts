import "server-only"
import { createHmac } from "node:crypto"
import { sql } from "@/lib/db"

function hashIp(ip: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET_MISSING")
  return createHmac("sha256", secret).update(ip.trim().toLowerCase()).digest("hex")
}

export async function checkSongRequestRateLimit(ip: string, limit = 5, windowSeconds = 60) {
  const ipHash = hashIp(ip)
  const rows = await sql`
    WITH cleanup AS (
      DELETE FROM song_request_rate_limits WHERE expires_at < now() - interval '1 hour'
    ), attempt AS (
      INSERT INTO song_request_rate_limits (ip_hash, window_started_at, request_count, expires_at)
      VALUES (${ipHash}, now(), 1, now() + (${windowSeconds} * interval '1 second'))
      ON CONFLICT (ip_hash) DO UPDATE SET
        window_started_at = CASE WHEN song_request_rate_limits.expires_at <= now() THEN now() ELSE song_request_rate_limits.window_started_at END,
        request_count = CASE WHEN song_request_rate_limits.expires_at <= now() THEN 1 ELSE song_request_rate_limits.request_count + 1 END,
        expires_at = CASE WHEN song_request_rate_limits.expires_at <= now() THEN now() + (${windowSeconds} * interval '1 second') ELSE song_request_rate_limits.expires_at END
      RETURNING request_count
    ) SELECT request_count FROM attempt
  ` as { request_count: number }[]
  return (rows[0]?.request_count ?? limit + 1) <= limit
}
