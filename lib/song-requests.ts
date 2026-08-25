import "server-only"
import { sql } from "@/lib/db"

export type FreeSongRequestStatus = "pending" | "accepted" | "played" | "rejected"

export type FreeSongRequest = {
  id: number
  requester_name: string
  song_title: string
  artist_name: string | null
  note: string | null
  status: FreeSongRequestStatus
  request_key: string
  spotify_track_id: string | null
  spotify_track_uri: string | null
  spotify_track_url: string | null
  spotify_artwork_url: string | null
  spotify_added_at: string | null
  created_at: string
  updated_at: string
}

export async function getFreeSongRequests(): Promise<FreeSongRequest[]> {
  return (await sql`
    SELECT id, requester_name, song_title, artist_name, note, status,
           request_key, spotify_track_id, spotify_track_uri, spotify_track_url,
           spotify_artwork_url, spotify_added_at, created_at, updated_at
    FROM free_song_requests
    ORDER BY
      CASE status
        WHEN 'pending' THEN 0
        WHEN 'accepted' THEN 1
        WHEN 'played' THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT 250
  `) as FreeSongRequest[]
}

export async function getFreeSongRequest(id: number): Promise<FreeSongRequest | null> {
  const rows = (await sql`
    SELECT id, requester_name, song_title, artist_name, note, status,
           request_key, spotify_track_id, spotify_track_uri, spotify_track_url,
           spotify_artwork_url, spotify_added_at, created_at, updated_at
    FROM free_song_requests WHERE id = ${id} LIMIT 1
  `) as FreeSongRequest[]
  return rows[0] || null
}

export async function hasRecentFreeSongRequest(requestKey: string): Promise<boolean> {
  const rows = (await sql`
    SELECT id
    FROM free_song_requests
    WHERE request_key = ${requestKey}
      AND created_at > now() - interval '90 seconds'
    LIMIT 1
  `) as { id: number }[]
  return rows.length > 0
}

export async function createFreeSongRequest(input: {
  requesterName: string
  songTitle: string
  artistName?: string
  note?: string
  requestKey: string
  spotifyTrackId?: string
  spotifyTrackUri?: string
  spotifyTrackUrl?: string
  spotifyArtworkUrl?: string
}): Promise<number> {
  const rows = (await sql`
    INSERT INTO free_song_requests (
      requester_name, song_title, artist_name, note, request_key,
      spotify_track_id, spotify_track_uri, spotify_track_url, spotify_artwork_url
    ) VALUES (
      ${input.requesterName},
      ${input.songTitle},
      ${input.artistName || null},
      ${input.note || null},
      ${input.requestKey},
      ${input.spotifyTrackId || null},
      ${input.spotifyTrackUri || null},
      ${input.spotifyTrackUrl || null},
      ${input.spotifyArtworkUrl || null}
    )
    RETURNING id
  `) as { id: number }[]
  return rows[0].id
}

export async function setFreeSongRequestStatus(
  id: number,
  status: FreeSongRequestStatus,
): Promise<void> {
  await sql`
    UPDATE free_song_requests
    SET status = ${status}, updated_at = now()
    WHERE id = ${id}
  `
}

export async function markFreeSongRequestAddedToSpotify(id: number): Promise<void> {
  await sql`
    UPDATE free_song_requests
    SET spotify_added_at = COALESCE(spotify_added_at, now()), updated_at = now()
    WHERE id = ${id}
  `
}
