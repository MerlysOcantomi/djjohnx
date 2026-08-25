import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { sql } from "@/lib/db"

const SPOTIFY_API = "https://api.spotify.com/v1"
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com"

export type SpotifyTrack = {
  id: string
  uri: string
  name: string
  artist: string
  artworkUrl: string | null
  spotifyUrl: string
}

type SpotifyConnection = {
  spotify_user_id: string
  display_name: string | null
  refresh_token_encrypted: string
  playlist_id: string | null
  playlist_url: string | null
}

function credentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("SPOTIFY_NOT_CONFIGURED")
  return { clientId, clientSecret }
}

function encryptionKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("CONFIG_MISSING_SESSION_SECRET")
  return createHash("sha256").update(secret).digest()
}

export function encryptSpotifyToken(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

function decryptSpotifyToken(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".")
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("SPOTIFY_TOKEN_INVALID")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"))
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

async function tokenRequest(body: URLSearchParams) {
  const { clientId, clientSecret } = credentials()
  const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })
  const data = await response.json().catch(() => ({})) as {
    access_token?: string
    refresh_token?: string
    error_description?: string
  }
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "SPOTIFY_TOKEN_ERROR")
  return data
}

export async function getSpotifyAppToken() {
  const data = await tokenRequest(new URLSearchParams({ grant_type: "client_credentials" }))
  return data.access_token!
}

export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  return tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  }))
}

async function refreshAccessToken(encryptedRefreshToken: string) {
  const refreshToken = decryptSpotifyToken(encryptedRefreshToken)
  const data = await tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }))
  return {
    accessToken: data.access_token!,
    replacementRefreshToken: data.refresh_token || null,
  }
}

export function spotifyAuthorizeUrl(state: string, redirectUri: string) {
  const { clientId } = credentials()
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "playlist-modify-private",
    redirect_uri: redirectUri,
    state,
    show_dialog: "true",
  })
  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`
}

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyAppToken()
  const params = new URLSearchParams({ q: query, type: "track", market: "ES", limit: "8" })
  const response = await fetch(`${SPOTIFY_API}/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!response.ok) throw new Error("SPOTIFY_SEARCH_ERROR")
  const data = await response.json() as {
    tracks?: { items?: Array<{
      id: string
      uri: string
      name: string
      artists?: Array<{ name: string }>
      album?: { images?: Array<{ url: string }> }
      external_urls?: { spotify?: string }
    }> }
  }
  return (data.tracks?.items || []).map((track) => ({
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: (track.artists || []).map((a) => a.name).join(", "),
    artworkUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
    spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
  }))
}

export async function saveSpotifyConnection(input: {
  spotifyUserId: string
  displayName: string | null
  refreshToken: string
  playlistId: string
  playlistUrl: string | null
}) {
  const encrypted = encryptSpotifyToken(input.refreshToken)
  await sql`
    INSERT INTO spotify_connections (
      id, spotify_user_id, display_name, refresh_token_encrypted, playlist_id, playlist_url, connected_at, updated_at
    ) VALUES (
      1, ${input.spotifyUserId}, ${input.displayName}, ${encrypted}, ${input.playlistId}, ${input.playlistUrl}, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      spotify_user_id = EXCLUDED.spotify_user_id,
      display_name = EXCLUDED.display_name,
      refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
      playlist_id = EXCLUDED.playlist_id,
      playlist_url = EXCLUDED.playlist_url,
      connected_at = now(),
      updated_at = now()
  `
}

export async function getSpotifyConnection(): Promise<SpotifyConnection | null> {
  const rows = await sql`
    SELECT spotify_user_id, display_name, refresh_token_encrypted, playlist_id, playlist_url
    FROM spotify_connections WHERE id = 1
  ` as SpotifyConnection[]
  return rows[0] || null
}

export async function createRequestsPlaylist(accessToken: string) {
  const response = await fetch(`${SPOTIFY_API}/me/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "DJ JOHNX — Peticiones",
      description: "Canciones aceptadas desde djjohnx.com/pide-tu-cancion",
      public: false,
    }),
    cache: "no-store",
  })
  const data = await response.json().catch(() => ({})) as {
    id?: string
    external_urls?: { spotify?: string }
  }
  if (!response.ok || !data.id) throw new Error("SPOTIFY_PLAYLIST_CREATE_ERROR")
  return { id: data.id, url: data.external_urls?.spotify || null }
}

export async function getSpotifyProfile(accessToken: string) {
  const response = await fetch(`${SPOTIFY_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const data = await response.json().catch(() => ({})) as { id?: string; display_name?: string | null }
  if (!response.ok || !data.id) throw new Error("SPOTIFY_PROFILE_ERROR")
  return { id: data.id, displayName: data.display_name || null }
}

export async function addTrackToRequestsPlaylist(trackUri: string) {
  const connection = await getSpotifyConnection()
  if (!connection?.playlist_id) return { ok: false as const, code: "NOT_CONNECTED" as const }

  const refreshed = await refreshAccessToken(connection.refresh_token_encrypted)
  if (refreshed.replacementRefreshToken) {
    const encrypted = encryptSpotifyToken(refreshed.replacementRefreshToken)
    await sql`UPDATE spotify_connections SET refresh_token_encrypted = ${encrypted}, updated_at = now() WHERE id = 1`
  }

  const response = await fetch(`${SPOTIFY_API}/playlists/${connection.playlist_id}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshed.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [trackUri] }),
    cache: "no-store",
  })
  if (!response.ok) return { ok: false as const, code: "ADD_FAILED" as const }
  return { ok: true as const, playlistUrl: connection.playlist_url }
}
