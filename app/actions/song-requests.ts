"use server"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import {
  createFreeSongRequest,
  getFreeSongRequest,
  hasRecentFreeSongRequest,
  markFreeSongRequestAddedToSpotify,
  setFreeSongRequestStatus,
  type FreeSongRequestStatus,
} from "@/lib/song-requests"
import { addTrackToRequestsPlaylist } from "@/lib/spotify"

const publicRequestSchema = z.object({
  requesterName: z.string().trim().min(1, "Escribe tu nombre o apodo").max(80),
  songTitle: z.string().trim().min(1, "Selecciona una cancion").max(160),
  artistName: z.string().trim().max(160).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
  deviceId: z.string().trim().min(8).max(120),
  website: z.string().max(0).optional().default(""),
  spotifyTrackId: z.string().trim().max(80).optional().default(""),
  spotifyTrackUri: z.string().trim().max(160).optional().default(""),
  spotifyTrackUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  spotifyArtworkUrl: z.string().trim().url().max(1000).optional().or(z.literal("")).default(""),
})

const adminStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["pending", "accepted", "played", "rejected"]),
})

export async function submitFreeSongRequest(input: {
  requesterName: string
  songTitle: string
  artistName?: string
  note?: string
  deviceId: string
  website?: string
  spotifyTrackId?: string
  spotifyTrackUri?: string
  spotifyTrackUrl?: string
  spotifyArtworkUrl?: string
}) {
  const data = publicRequestSchema.parse(input)
  const requestKey = createHash("sha256").update(data.deviceId).digest("hex")

  if (await hasRecentFreeSongRequest(requestKey)) {
    return {
      ok: false as const,
      code: "RATE_LIMIT" as const,
      message: "Ya enviaste una peticion hace muy poco. Espera un momento y vuelve a intentarlo.",
    }
  }

  const id = await createFreeSongRequest({
    requesterName: data.requesterName,
    songTitle: data.songTitle,
    artistName: data.artistName,
    note: data.note,
    requestKey,
    spotifyTrackId: data.spotifyTrackId,
    spotifyTrackUri: data.spotifyTrackUri,
    spotifyTrackUrl: data.spotifyTrackUrl,
    spotifyArtworkUrl: data.spotifyArtworkUrl,
  })

  revalidatePath("/admin/peticiones")
  return { ok: true as const, id }
}

export async function updateFreeSongRequestStatus(input: {
  id: number
  status: FreeSongRequestStatus
}) {
  await requireAdmin()
  const data = adminStatusSchema.parse(input)
  const request = await getFreeSongRequest(data.id)
  if (!request) throw new Error("REQUEST_NOT_FOUND")

  await setFreeSongRequestStatus(data.id, data.status)

  let spotify: "added" | "already_added" | "not_connected" | "not_selected" | "failed" | null = null
  let playlistUrl: string | null = null

  if (data.status === "accepted") {
    if (request.spotify_added_at) {
      spotify = "already_added"
    } else if (!request.spotify_track_uri) {
      spotify = "not_selected"
    } else {
      const result = await addTrackToRequestsPlaylist(request.spotify_track_uri)
      if (result.ok) {
        await markFreeSongRequestAddedToSpotify(data.id)
        spotify = "added"
        playlistUrl = result.playlistUrl || null
      } else {
        spotify = result.code === "NOT_CONNECTED" ? "not_connected" : "failed"
      }
    }
  }

  revalidatePath("/admin/peticiones")
  return { ok: true as const, spotify, playlistUrl }
}
