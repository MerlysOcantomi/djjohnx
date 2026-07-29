"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdminSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getSettings, saveSettings, type SiteSettings } from "@/lib/data"

/* ============================ Esquemas ============================ */

const profileSchema = z.object({
  artistName: z.string().trim().min(1, "El nombre artistico es obligatorio").max(120),
  legalName: z.string().trim().max(200).default(""),
  taxId: z.string().trim().max(40).default(""),
  address: z.string().trim().max(300).default(""),
  postalCode: z.string().trim().max(12).default(""),
  city: z.string().trim().max(120).default(""),
  province: z.string().trim().max(120).default(""),
  country: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Correo no valido",
  }),
})

const billingSchema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1, "El prefijo es obligatorio")
    .max(12)
    .regex(/^[A-Za-z0-9]+$/, "El prefijo solo admite letras y numeros"),
  nextNumber: z.number().int().min(1).max(999999),
  currency: z.string().trim().length(3).default("EUR"),
  vatPercent: z.number().min(0).max(100),
  irpfPercent: z.number().min(0).max(100),
  paymentTerms: z.string().trim().max(300).default(""),
  conditions: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(2000).default(""),
  bankHolder: z.string().trim().max(200).default(""),
  iban: z.string().trim().max(40).default(""),
  bic: z.string().trim().max(20).default(""),
})

const appearanceSchema = z.object({
  logoUrl: z.string().trim().max(2000).default(""),
  logoPosition: z.enum(["left", "center", "right"]).default("left"),
  logoSize: z.enum(["small", "medium", "large"]).default("medium"),
  watermark: z.boolean().default(false),
  accentColor: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || /^#[0-9a-fA-F]{3,8}$/.test(v), { message: "Color no valido" })
    .default(""),
})

function revalidateSettings() {
  revalidatePath("/admin/configuracion")
  revalidatePath("/admin/facturas")
  revalidatePath("/")
}

/* ============================ Acciones ============================ */

export async function saveProfileAction(input: unknown) {
  await requireAdminSession()
  const data = profileSchema.parse(input)
  const settings = await getSettings()
  settings.profile = { ...settings.profile, ...data }
  await saveSettings(settings)
  revalidateSettings()
  return { ok: true }
}

export async function saveBillingAction(input: unknown) {
  await requireAdminSession()
  const data = billingSchema.parse(input)
  const settings = await getSettings()
  settings.billing = { ...settings.billing, ...data }
  await saveSettings(settings)

  // Alinea el contador atomico con el "siguiente numero" configurado.
  // Nunca lo retrocede: eso reutilizaria numeros ya emitidos.
  const year = new Date().getFullYear()
  await sql`
    INSERT INTO invoice_counters (prefix, year, next_number)
    VALUES (${data.prefix}, ${year}, ${data.nextNumber})
    ON CONFLICT (prefix, year) DO UPDATE
      SET next_number = GREATEST(invoice_counters.next_number, EXCLUDED.next_number),
          updated_at = now()
  `

  revalidateSettings()
  return { ok: true }
}

export async function saveAppearanceAction(input: unknown) {
  await requireAdminSession()
  const data = appearanceSchema.parse(input)
  const settings = await getSettings()
  settings.logo = {
    url: data.logoUrl,
    position: data.logoPosition,
    size: data.logoSize,
    watermark: data.watermark,
  }
  settings.appearance = { ...settings.appearance, accentColor: data.accentColor }
  await saveSettings(settings)
  revalidateSettings()
  return { ok: true }
}

/* ============================ Respaldo ============================ */

export type BackupFile = {
  format: "djjohnx-backup"
  version: 1
  exportedAt: string
  settings: SiteSettings
  sections: unknown[]
  services: unknown[]
  events: unknown[]
  gallery_images: unknown[]
  jobs: unknown[]
  invoices: unknown[]
  invoice_items: unknown[]
}

/**
 * Exporta todo el contenido en JSON. No incluye binarios de Blob:
 * de las imagenes se guardan la URL y el pathname.
 */
export async function exportBackupAction(): Promise<BackupFile> {
  await requireAdminSession()
  const [settings, sections, services, events, gallery, jobs, invoices, items] = await Promise.all([
    getSettings(),
    sql`SELECT * FROM site_sections ORDER BY sort_order, id`,
    sql`SELECT * FROM services ORDER BY sort_order, id`,
    sql`SELECT * FROM events ORDER BY sort_order, id`,
    sql`SELECT * FROM gallery_images ORDER BY sort_order, id`,
    sql`SELECT * FROM jobs ORDER BY id`,
    sql`SELECT * FROM invoices ORDER BY id`,
    sql`SELECT * FROM invoice_items ORDER BY invoice_id, sort_order, id`,
  ])

  return {
    format: "djjohnx-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    sections: sections as unknown[],
    services: services as unknown[],
    events: events as unknown[],
    gallery_images: gallery as unknown[],
    jobs: jobs as unknown[],
    invoices: invoices as unknown[],
    invoice_items: items as unknown[],
  }
}

const backupSchema = z.object({
  format: z.literal("djjohnx-backup"),
  version: z.literal(1),
  settings: z.record(z.unknown()).optional(),
  sections: z.array(z.record(z.unknown())).default([]),
  services: z.array(z.record(z.unknown())).default([]),
  events: z.array(z.record(z.unknown())).default([]),
  gallery_images: z.array(z.record(z.unknown())).default([]),
  jobs: z.array(z.record(z.unknown())).default([]),
  invoices: z.array(z.record(z.unknown())).default([]),
  invoice_items: z.array(z.record(z.unknown())).default([]),
})

export type BackupSummary = {
  sections: number
  services: number
  events: number
  gallery_images: number
  jobs: number
  invoices: number
  invoice_items: number
  hasSettings: boolean
}

/** Valida el archivo y devuelve un resumen para confirmar antes de importar. */
export async function inspectBackupAction(raw: unknown): Promise<BackupSummary> {
  await requireAdminSession()
  const b = backupSchema.parse(raw)
  return {
    sections: b.sections.length,
    services: b.services.length,
    events: b.events.length,
    gallery_images: b.gallery_images.length,
    jobs: b.jobs.length,
    invoices: b.invoices.length,
    invoice_items: b.invoice_items.length,
    hasSettings: Boolean(b.settings),
  }
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}
function int(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : fallback
}
function bool(v: unknown, fallback = true): boolean {
  return typeof v === "boolean" ? v : fallback
}

/**
 * Importa una copia de seguridad en modo "combinar".
 *
 * Solo anade lo que no existe: no borra ni sobrescribe filas existentes, asi
 * que ejecutarla dos veces no duplica el contenido. Las secciones y los
 * ajustes se identifican por su clave; servicios, eventos e imagenes por un
 * campo natural (titulo o URL del blob).
 */
export async function importBackupAction(raw: unknown) {
  await requireAdminSession()
  const b = backupSchema.parse(raw)
  const added = { sections: 0, services: 0, events: 0, gallery_images: 0 }

  for (const s of b.sections) {
    const id = str(s.id)
    if (!id) continue
    const res = (await sql`
      INSERT INTO site_sections (id, title, subtitle, content, image_url, button_text, button_link, extra, sort_order, visible)
      VALUES (${id}, ${str(s.title)}, ${str(s.subtitle)}, ${str(s.content)}, ${str(s.image_url)},
              ${str(s.button_text)}, ${str(s.button_link)}, ${JSON.stringify(s.extra ?? {})}::jsonb,
              ${int(s.sort_order)}, ${bool(s.visible)})
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `) as { id: string }[]
    if (res.length) added.sections++
  }

  for (const s of b.services) {
    const title = str(s.title)
    if (!title) continue
    const res = (await sql`
      INSERT INTO services (title, description, image_url, price_minor, price_note, button_text, button_link, sort_order, is_published)
      SELECT ${title}, ${str(s.description)}, ${str(s.image_url)},
             ${s.price_minor === null || s.price_minor === undefined ? null : int(s.price_minor)},
             ${str(s.price_note)}, ${str(s.button_text)}, ${str(s.button_link)},
             ${int(s.sort_order)}, ${bool(s.is_published)}
      WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = ${title})
      RETURNING id
    `) as { id: number }[]
    if (res.length) added.services++
  }

  for (const e of b.events) {
    const title = str(e.title)
    if (!title) continue
    const date = str(e.event_date)
    const res = (await sql`
      INSERT INTO events (title, event_date, event_time, venue, city, description, image_url, tickets_link, sort_order, is_published)
      SELECT ${title}, ${date}, ${str(e.event_time)}, ${str(e.venue)}, ${str(e.city)},
             ${str(e.description)}, ${str(e.image_url)}, ${str(e.tickets_link)},
             ${int(e.sort_order)}, ${bool(e.is_published)}
      WHERE NOT EXISTS (
        SELECT 1 FROM events WHERE title = ${title} AND event_date IS NOT DISTINCT FROM ${date}::date
      )
      RETURNING id
    `) as { id: number }[]
    if (res.length) added.events++
  }

  for (const g of b.gallery_images) {
    const url = str(g.blob_url)
    if (!url) continue
    const res = (await sql`
      INSERT INTO gallery_images (blob_url, blob_pathname, title, description, alt_text, category, sort_order, is_published, is_featured)
      SELECT ${url}, ${str(g.blob_pathname)}, ${str(g.title)}, ${str(g.description)}, ${str(g.alt_text)},
             ${str(g.category) ?? "Otros"}, ${int(g.sort_order)}, ${bool(g.is_published)}, ${bool(g.is_featured, false)}
      WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE blob_url = ${url})
      RETURNING id
    `) as { id: number }[]
    if (res.length) added.gallery_images++
  }

  // Los ajustes solo se restauran si aun no hay ninguno guardado, para no
  // pisar la configuracion actual sin avisar.
  if (b.settings) {
    await sql`
      INSERT INTO site_settings (id, data, updated_at)
      VALUES (1, ${JSON.stringify(b.settings)}::jsonb, now())
      ON CONFLICT (id) DO NOTHING
    `
  }

  revalidateSettings()
  revalidatePath("/admin/fotos")
  revalidatePath("/admin/servicios")
  revalidatePath("/admin/eventos")
  return added
}
