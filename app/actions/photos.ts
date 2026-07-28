"use server"

import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { GALLERY_CATEGORIES } from "@/lib/data"
import { del } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const categoryEnum = z.enum(GALLERY_CATEGORIES)

function revalidateAll() {
  revalidatePath("/")
  revalidatePath("/admin/fotos")
}

/** Registra en Neon una foto ya subida a Blob (una o varias). */
const createSchema = z.object({
  blobUrl: z.string().url(),
  blobPathname: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  altText: z.string().max(300).optional().default(""),
  category: categoryEnum.optional().default("Otros"),
})

export async function createPhoto(input: unknown) {
  await requireAdmin()
  const data = createSchema.parse(input)

  const rows = (await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM gallery_images`) as {
    next: number
  }[]
  const nextOrder = rows[0]?.next ?? 0

  await sql`
    INSERT INTO gallery_images (blob_url, blob_pathname, title, alt_text, category, sort_order, is_published)
    VALUES (${data.blobUrl}, ${data.blobPathname}, ${data.title}, ${data.altText}, ${data.category}, ${nextOrder}, true)
  `
  revalidateAll()
  return { ok: true }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  altText: z.string().max(300).optional(),
  category: categoryEnum.optional(),
})

export async function updatePhoto(input: unknown) {
  await requireAdmin()
  const data = updateSchema.parse(input)
  await sql`
    UPDATE gallery_images SET
      title = COALESCE(${data.title ?? null}, title),
      description = COALESCE(${data.description ?? null}, description),
      alt_text = COALESCE(${data.altText ?? null}, alt_text),
      category = COALESCE(${data.category ?? null}, category),
      updated_at = now()
    WHERE id = ${data.id}
  `
  revalidateAll()
  return { ok: true }
}

export async function setPhotoPublished(id: number, published: boolean) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`UPDATE gallery_images SET is_published = ${published}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

export async function setPhotoFeatured(id: number, featured: boolean) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`UPDATE gallery_images SET is_featured = ${featured}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

/** Reordena: recibe la lista completa de ids en el nuevo orden. */
export async function reorderPhotos(ids: number[]) {
  await requireAdmin()
  z.array(z.number().int().positive()).parse(ids)
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE gallery_images SET sort_order = ${i}, updated_at = now() WHERE id = ${ids[i]}`
  }
  revalidateAll()
  return { ok: true }
}

/** Reemplaza el archivo: sube el nuevo (cliente), actualiza Neon, borra el anterior. */
const replaceSchema = z.object({
  id: z.number().int().positive(),
  newBlobUrl: z.string().url(),
  newBlobPathname: z.string().min(1),
})

export async function replacePhoto(input: unknown) {
  await requireAdmin()
  const data = replaceSchema.parse(input)

  const rows = (await sql`SELECT blob_url, blob_pathname FROM gallery_images WHERE id = ${data.id}`) as {
    blob_url: string
    blob_pathname: string | null
  }[]
  const prev = rows[0]
  if (!prev) throw new Error("No encontrada")

  // Actualiza Neon primero para no perder la referencia
  await sql`
    UPDATE gallery_images SET blob_url = ${data.newBlobUrl}, blob_pathname = ${data.newBlobPathname}, updated_at = now()
    WHERE id = ${data.id}
  `

  // Borra el archivo anterior (si difiere y era nuestro)
  if (prev.blob_url && prev.blob_url !== data.newBlobUrl && prev.blob_pathname) {
    try {
      await del(prev.blob_url)
    } catch {
      // no bloqueamos por un huerfano puntual
    }
  }
  revalidateAll()
  return { ok: true }
}

export async function deletePhoto(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)

  const rows = (await sql`SELECT blob_url, blob_pathname FROM gallery_images WHERE id = ${id}`) as {
    blob_url: string
    blob_pathname: string | null
  }[]
  const row = rows[0]

  // Borra el archivo de Blob solo si tenemos pathname (subido por nosotros)
  if (row?.blob_pathname && row.blob_url) {
    try {
      await del(row.blob_url)
    } catch {
      // continua para no dejar registro huerfano
    }
  }

  await sql`DELETE FROM gallery_images WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}
