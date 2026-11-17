"use server"

import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

const schema = z.object({
  eventId: z.number().int().positive(),
  imageUrl: z.string().url().refine((url) => url.startsWith("https://") && new URL(url).hostname.endsWith(".public.blob.vercel-storage.com"), "El cartel debe guardarse en Vercel Blob"),
})

/** Solo cambia la imagen del evento elegido; nunca modifica otros campos ni publica. */
export async function saveEventPoster(input: unknown) {
  await requireAdmin()
  const { eventId, imageUrl } = schema.parse(input)
  const rows = (await sql`UPDATE events SET image_url = ${imageUrl}, updated_at = now() WHERE id = ${eventId} RETURNING id`) as {id:number}[]
  if (!rows.length) throw new Error("Evento no encontrado")
  revalidatePath("/john")
  revalidatePath("/admin/eventos")
  return { ok: true }
}
