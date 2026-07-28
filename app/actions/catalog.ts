"use server"

import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { eurosToMinor } from "@/lib/format"
import { revalidatePath } from "next/cache"
import { z } from "zod"

function revalidateAll() {
  revalidatePath("/")
  revalidatePath("/admin/servicios")
  revalidatePath("/admin/eventos")
}

/* ============ SERVICIOS ============ */

const serviceSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1, "El titulo es obligatorio").max(200),
  description: z.string().max(2000).optional().default(""),
  imageUrl: z.string().url().optional().or(z.literal("")).default(""),
  priceEuros: z.string().optional().default(""), // texto "150,00" o vacio
  priceNote: z.string().max(100).optional().default(""),
  buttonText: z.string().max(60).optional().default(""),
  buttonLink: z.string().max(300).optional().default(""),
  isPublished: z.boolean().optional().default(true),
})

export async function saveService(input: unknown) {
  await requireAdmin()
  const d = serviceSchema.parse(input)
  const priceMinor = d.priceEuros ? eurosToMinor(d.priceEuros) : null

  if (d.id) {
    await sql`
      UPDATE services SET
        title = ${d.title}, description = ${d.description}, image_url = ${d.imageUrl || null},
        price_minor = ${priceMinor}, price_note = ${d.priceNote || null},
        button_text = ${d.buttonText || null}, button_link = ${d.buttonLink || null},
        is_published = ${d.isPublished}, updated_at = now()
      WHERE id = ${d.id}
    `
  } else {
    const rows = (await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM services`) as { next: number }[]
    await sql`
      INSERT INTO services (title, description, image_url, price_minor, price_note, button_text, button_link, sort_order, is_published)
      VALUES (${d.title}, ${d.description}, ${d.imageUrl || null}, ${priceMinor}, ${d.priceNote || null},
              ${d.buttonText || null}, ${d.buttonLink || null}, ${rows[0]?.next ?? 0}, ${d.isPublished})
    `
  }
  revalidateAll()
  return { ok: true }
}

export async function setServicePublished(id: number, published: boolean) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`UPDATE services SET is_published = ${published}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

export async function reorderServices(ids: number[]) {
  await requireAdmin()
  z.array(z.number().int().positive()).parse(ids)
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE services SET sort_order = ${i}, updated_at = now() WHERE id = ${ids[i]}`
  }
  revalidateAll()
  return { ok: true }
}

export async function deleteService(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`DELETE FROM services WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

/* ============ EVENTOS ============ */

const eventSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1, "El titulo es obligatorio").max(200),
  eventDate: z.string().optional().default(""), // YYYY-MM-DD o vacio
  eventTime: z.string().max(50).optional().default(""),
  venue: z.string().max(200).optional().default(""),
  city: z.string().max(120).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  imageUrl: z.string().url().optional().or(z.literal("")).default(""),
  ticketsLink: z.string().max(300).optional().default(""),
  isPublished: z.boolean().optional().default(true),
})

export async function saveEvent(input: unknown) {
  await requireAdmin()
  const d = eventSchema.parse(input)
  const date = d.eventDate || null

  if (d.id) {
    await sql`
      UPDATE events SET
        title = ${d.title}, event_date = ${date}, event_time = ${d.eventTime || null},
        venue = ${d.venue || null}, city = ${d.city || null}, description = ${d.description || null},
        image_url = ${d.imageUrl || null}, tickets_link = ${d.ticketsLink || null},
        is_published = ${d.isPublished}, updated_at = now()
      WHERE id = ${d.id}
    `
  } else {
    const rows = (await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM events`) as { next: number }[]
    await sql`
      INSERT INTO events (title, event_date, event_time, venue, city, description, image_url, tickets_link, sort_order, is_published)
      VALUES (${d.title}, ${date}, ${d.eventTime || null}, ${d.venue || null}, ${d.city || null},
              ${d.description || null}, ${d.imageUrl || null}, ${d.ticketsLink || null}, ${rows[0]?.next ?? 0}, ${d.isPublished})
    `
  }
  revalidateAll()
  return { ok: true }
}

export async function duplicateEvent(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  const rows = (await sql`SELECT * FROM events WHERE id = ${id}`) as Record<string, unknown>[]
  const e = rows[0]
  if (!e) throw new Error("No encontrado")
  const next = (await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM events`) as { next: number }[]
  await sql`
    INSERT INTO events (title, event_date, event_time, venue, city, description, image_url, tickets_link, sort_order, is_published)
    VALUES (${(e.title as string) + " (copia)"}, ${e.event_date}, ${e.event_time}, ${e.venue}, ${e.city},
            ${e.description}, ${e.image_url}, ${e.tickets_link}, ${next[0]?.next ?? 0}, false)
  `
  revalidateAll()
  return { ok: true }
}

export async function setEventPublished(id: number, published: boolean) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`UPDATE events SET is_published = ${published}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

export async function deleteEvent(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`DELETE FROM events WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}
