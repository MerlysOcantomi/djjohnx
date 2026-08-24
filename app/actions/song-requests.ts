"use server"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import {
  createFreeSongRequest,
  hasRecentFreeSongRequest,
  setFreeSongRequestStatus,
  type FreeSongRequestStatus,
} from "@/lib/song-requests"

const publicRequestSchema = z.object({
  requesterName: z.string().trim().min(1, "Escribe tu nombre o apodo").max(80),
  songTitle: z.string().trim().min(1, "Escribe el nombre de la cancion").max(160),
  artistName: z.string().trim().max(160).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
  deviceId: z.string().trim().min(8).max(120),
  website: z.string().max(0).optional().default(""),
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
  await setFreeSongRequestStatus(data.id, data.status)
  revalidatePath("/admin/peticiones")
  return { ok: true as const }
}
