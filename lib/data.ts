import "server-only"
import { sql } from "@/lib/db"
import { normalizeInvoiceStatus, normalizeJobStatus, normalizePaymentStatus } from "@/lib/status"

/* ============================ Tipos ============================ */

export type SiteSettings = {
  profile: {
    artistName: string
    legalName: string
    taxId: string
    address: string
    postalCode: string
    city: string
    province: string
    country: string
    phone: string
    email: string
  }
  contact: {
    email: string
    phone: string
    whatsappNumber: string
    location: string
    instagram: string
    facebook: string
    tiktok: string
    youtube: string
    otherLinks?: { label: string; url: string }[]
    show?: Record<string, boolean>
  }
  logo: {
    url: string
    position: "left" | "center" | "right"
    size: "small" | "medium" | "large"
    watermark: boolean
  }
  billing: {
    prefix: string
    nextNumber: number
    currency: string
    vatPercent: number
    irpfPercent: number
    paymentTerms: string
    conditions: string
    notes: string
    bankHolder: string
    iban: string
    bic: string
  }
  appearance: {
    accentColor: string
  }
}

export type SiteSection = {
  id: string
  title: string | null
  subtitle: string | null
  content: string | null
  image_url: string | null
  button_text: string | null
  button_link: string | null
  extra: Record<string, unknown>
  sort_order: number
  visible: boolean
}

export type Service = {
  id: number
  title: string
  description: string | null
  image_url: string | null
  price_minor: number | null
  price_note: string | null
  button_text: string | null
  button_link: string | null
  sort_order: number
  is_published: boolean
}

export type EventRow = {
  id: number
  title: string
  event_date: string | null
  event_time: string | null
  venue: string | null
  city: string | null
  description: string | null
  image_url: string | null
  tickets_link: string | null
  sort_order: number
  is_published: boolean
}

export type GalleryImage = {
  id: number
  blob_url: string
  blob_pathname: string | null
  title: string | null
  description: string | null
  alt_text: string | null
  category: string
  sort_order: number
  is_published: boolean
  is_featured: boolean
  created_at: string
}

export const GALLERY_CATEGORIES = [
  "Eventos",
  "Bodas",
  "Clubs",
  "Sesiones",
  "Promocion",
  "Otros",
] as const

export type Job = {
  id: number
  job_date: string | null
  client_name: string
  company: string | null
  venue: string | null
  address: string | null
  concept: string | null
  description: string | null
  start_time: string | null
  end_time: string | null
  amount_minor: number
  currency: string
  paid_minor: number
  job_status: string
  payment_status: string
  invoice_id: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  id: number
  invoice_id: number
  service_date: string | null
  concept: string
  description: string | null
  quantity: number
  unit_price_minor: number
  total_minor: number
  sort_order: number
}

export type Invoice = {
  id: number
  number: string
  status: string
  issue_date: string | null
  due_date: string | null
  currency: string
  client_name: string | null
  client_tax_id: string | null
  client_address: string | null
  client_postal_code: string | null
  client_city: string | null
  client_province: string | null
  client_country: string | null
  client_email: string | null
  client_phone: string | null
  discount_type: string | null
  discount_value_minor: number
  discount_percent: number
  vat_enabled: boolean
  vat_percent: number
  irpf_enabled: boolean
  irpf_percent: number
  subtotal_minor: number
  discount_minor: number
  base_minor: number
  vat_minor: number
  irpf_minor: number
  total_minor: number
  payment_method: string | null
  payment_holder: string | null
  payment_iban: string | null
  payment_bic: string | null
  payment_reference: string | null
  payment_terms: string | null
  client_notes: string | null
  internal_notes: string | null
  job_id: number | null
  created_at: string
  updated_at: string
}

/* ====================== Valores por defecto ====================== */

const DEFAULT_SETTINGS: SiteSettings = {
  profile: {
    artistName: "DJ JOHNX",
    legalName: "",
    taxId: "",
    address: "",
    postalCode: "",
    city: "Alicante",
    province: "Alicante",
    country: "Espana",
    phone: "+34 672 176 890",
    email: "booking@djjohnx.com",
  },
  contact: {
    email: "booking@djjohnx.com",
    phone: "+34 672 176 890",
    whatsappNumber: "34672176890",
    location: "Alicante, Espana",
    instagram: "https://www.instagram.com/dj_john_x/",
    facebook: "#",
    tiktok: "",
    youtube: "https://youtu.be/Mo1ri6aCWCA",
    otherLinks: [],
    show: {},
  },
  logo: { url: "", position: "left", size: "medium", watermark: false },
  billing: {
    prefix: "DJ",
    nextNumber: 1,
    currency: "EUR",
    vatPercent: 21,
    irpfPercent: 15,
    paymentTerms: "",
    conditions: "",
    notes: "",
    bankHolder: "",
    iban: "",
    bic: "",
  },
  appearance: { accentColor: "" },
}

/* ====================== Configuracion ====================== */

export async function getSettings(): Promise<SiteSettings> {
  try {
    const rows = (await sql`SELECT data FROM site_settings WHERE id = 1`) as { data: Partial<SiteSettings> }[]
    if (!rows.length) return DEFAULT_SETTINGS
    const d = rows[0].data || {}
    // Merge superficial por seccion para tolerar campos que falten
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...(d.profile || {}) },
      contact: { ...DEFAULT_SETTINGS.contact, ...(d.contact || {}) },
      logo: { ...DEFAULT_SETTINGS.logo, ...(d.logo || {}) },
      billing: { ...DEFAULT_SETTINGS.billing, ...(d.billing || {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(d.appearance || {}) },
    }
  } catch {
    console.warn("[v0] getSettings fallo, usando defaults")
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(next: SiteSettings): Promise<void> {
  await sql`
    INSERT INTO site_settings (id, data, updated_at)
    VALUES (1, ${JSON.stringify(next)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `
}

/* ====================== Secciones ====================== */

export async function getSections(): Promise<Record<string, SiteSection>> {
  try {
    const rows = (await sql`SELECT * FROM site_sections`) as SiteSection[]
    const map: Record<string, SiteSection> = {}
    for (const r of rows) map[r.id] = { ...r, extra: r.extra || {} }
    return map
  } catch {
    return {}
  }
}

export async function saveSection(section: {
  id: string
  title?: string | null
  subtitle?: string | null
  content?: string | null
  image_url?: string | null
  button_text?: string | null
  button_link?: string | null
  extra?: Record<string, unknown>
  sort_order?: number
  visible?: boolean
}): Promise<void> {
  await sql`
    INSERT INTO site_sections (id, title, subtitle, content, image_url, button_text, button_link, extra, sort_order, visible, updated_at)
    VALUES (
      ${section.id},
      ${section.title ?? null},
      ${section.subtitle ?? null},
      ${section.content ?? null},
      ${section.image_url ?? null},
      ${section.button_text ?? null},
      ${section.button_link ?? null},
      ${JSON.stringify(section.extra ?? {})}::jsonb,
      ${section.sort_order ?? 0},
      ${section.visible ?? true},
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      content = EXCLUDED.content,
      image_url = EXCLUDED.image_url,
      button_text = EXCLUDED.button_text,
      button_link = EXCLUDED.button_link,
      extra = EXCLUDED.extra,
      sort_order = EXCLUDED.sort_order,
      visible = EXCLUDED.visible,
      updated_at = now()
  `
}

/* ====================== Servicios ====================== */

export async function getServices(onlyPublished = false): Promise<Service[]> {
  try {
    if (onlyPublished) {
      return (await sql`SELECT * FROM services WHERE is_published = true ORDER BY sort_order ASC, id ASC`) as Service[]
    }
    return (await sql`SELECT * FROM services ORDER BY sort_order ASC, id ASC`) as Service[]
  } catch {
    return []
  }
}

/* ====================== Eventos ====================== */

export async function getEvents(onlyPublished = false): Promise<EventRow[]> {
  try {
    if (onlyPublished) {
      return (await sql`SELECT * FROM events WHERE is_published = true ORDER BY sort_order ASC, event_date ASC NULLS LAST, id ASC`) as EventRow[]
    }
    return (await sql`SELECT * FROM events ORDER BY sort_order ASC, event_date ASC NULLS LAST, id ASC`) as EventRow[]
  } catch {
    return []
  }
}

/* ====================== Galeria ====================== */

export async function getGalleryImages(onlyPublished = false): Promise<GalleryImage[]> {
  try {
    if (onlyPublished) {
      return (await sql`SELECT * FROM gallery_images WHERE is_published = true ORDER BY sort_order ASC, id ASC`) as GalleryImage[]
    }
    return (await sql`SELECT * FROM gallery_images ORDER BY sort_order ASC, id ASC`) as GalleryImage[]
  } catch {
    return []
  }
}

/* ============ Composicion del contenido publico ============ */

/**
 * Construye el objeto de contenido con la MISMA forma que consumen los
 * componentes publicos actuales, leyendo desde Neon.
 */
export async function getPublicContent() {
  const [settings, sections, events, gallery, services] = await Promise.all([
    getSettings(),
    getSections(),
    getEvents(true),
    getGalleryImages(true),
    getServices(true),
  ])

  const hero = sections["hero"]
  const about = sections["about"]
  const video = sections["video"]
  const firstEvent = events[0]

  return {
    hero: hero
      ? {
          backgroundImage: hero.image_url || undefined,
          backgroundPosition: (hero.extra?.backgroundPosition as string) || undefined,
          title: hero.title || undefined,
          subtitle: hero.subtitle || undefined,
          description: hero.content || undefined,
          visible: hero.visible,
        }
      : undefined,
    about: about
      ? {
          image: about.image_url || undefined,
          title: about.title || undefined,
          description: about.content || undefined,
          stats: (about.extra?.stats as { number: string; label: string }[]) || undefined,
          visible: about.visible,
        }
      : undefined,
    video: video
      ? {
          title: video.title || undefined,
          description: video.content || undefined,
          youtubeId: (video.extra?.youtubeId as string) || undefined,
          visible: video.visible,
        }
      : undefined,
    events: firstEvent
      ? {
          eventName: firstEvent.title,
          image: firstEvent.image_url || undefined,
          venue: firstEvent.venue || undefined,
          location: firstEvent.city || undefined,
          schedule: firstEvent.event_time || undefined,
          session: firstEvent.description || undefined,
        }
      : undefined,
    // Resto de eventos publicados, ademas del destacado de arriba.
    moreEvents: events.slice(1).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.event_date,
      time: e.event_time,
      venue: e.venue,
      city: e.city,
      image: e.image_url,
      ticketsLink: e.tickets_link,
    })),
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      image: s.image_url,
      priceMinor: s.price_minor,
      priceNote: s.price_note,
      buttonText: s.button_text,
      buttonLink: s.button_link,
    })),
    gallery: gallery.map((g) => ({
      id: g.id,
      src: g.blob_url,
      alt: g.alt_text || g.title || "DJ JOHNX",
      category: g.category,
    })),
    contact: {
      email: settings.contact.email,
      phone: settings.contact.phone,
      whatsappNumber: settings.contact.whatsappNumber,
      location: settings.contact.location,
      instagram: settings.contact.instagram,
      facebook: settings.contact.facebook,
      youtube: settings.contact.youtube,
      tiktok: settings.contact.tiktok,
    },
  }
}

/* ====================== Trabajos ====================== */

/** Protege la lectura frente a filas anteriores a la migracion 0002. */
function normalizeJobRow(j: Job): Job {
  return {
    ...j,
    job_status: normalizeJobStatus(j.job_status),
    payment_status: normalizePaymentStatus(j.payment_status),
  }
}

export async function getJobs(): Promise<Job[]> {
  try {
    const rows = (await sql`SELECT * FROM jobs ORDER BY job_date DESC NULLS LAST, id DESC`) as Job[]
    return rows.map(normalizeJobRow)
  } catch {
    return []
  }
}

export async function getJob(id: number): Promise<Job | null> {
  const rows = (await sql`SELECT * FROM jobs WHERE id = ${id}`) as Job[]
  return rows[0] ? normalizeJobRow(rows[0]) : null
}

/* ====================== Facturas ====================== */

function normalizeInvoiceRow(i: Invoice): Invoice {
  return { ...i, status: normalizeInvoiceStatus(i.status) }
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const rows = (await sql`SELECT * FROM invoices ORDER BY issue_date DESC NULLS LAST, id DESC`) as Invoice[]
    return rows.map(normalizeInvoiceRow)
  } catch {
    return []
  }
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const rows = (await sql`SELECT * FROM invoices WHERE id = ${id}`) as Invoice[]
  return rows[0] ? normalizeInvoiceRow(rows[0]) : null
}

export async function getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
  return (await sql`SELECT * FROM invoice_items WHERE invoice_id = ${invoiceId} ORDER BY sort_order ASC, id ASC`) as InvoiceItem[]
}

/* ====================== Resumen del panel ====================== */

export type DashboardStats = {
  jobsTotal: number
  jobsPending: number
  jobsConfirmed: number
  jobsCompleted: number
  collectedMinor: number
  pendingMinor: number
  invoicesDraft: number
  invoicesPending: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const jobs = (await sql`
      SELECT job_status, amount_minor, paid_minor FROM jobs
    `) as { job_status: string; amount_minor: number; paid_minor: number }[]

    const invoices = (await sql`
      SELECT status FROM invoices
    `) as { status: string }[]

    let collectedMinor = 0
    let pendingMinor = 0
    let jobsPending = 0
    let jobsConfirmed = 0
    let jobsCompleted = 0

    for (const j of jobs) {
      const st = normalizeJobStatus(j.job_status)
      if (st === "cancelled") continue
      collectedMinor += j.paid_minor
      pendingMinor += Math.max(0, j.amount_minor - j.paid_minor)
      if (st === "pending") jobsPending++
      else if (st === "confirmed") jobsConfirmed++
      else if (st === "completed") jobsCompleted++
    }

    const statuses = invoices.map((i) => normalizeInvoiceStatus(i.status))
    const invoicesDraft = statuses.filter((s) => s === "draft").length
    const invoicesPending = statuses.filter((s) => s === "issued" || s === "sent").length

    return {
      jobsTotal: jobs.length,
      jobsPending,
      jobsConfirmed,
      jobsCompleted,
      collectedMinor,
      pendingMinor,
      invoicesDraft,
      invoicesPending,
    }
  } catch {
    return {
      jobsTotal: 0,
      jobsPending: 0,
      jobsConfirmed: 0,
      jobsCompleted: 0,
      collectedMinor: 0,
      pendingMinor: 0,
      invoicesDraft: 0,
      invoicesPending: 0,
    }
  }
}

export async function getUpcomingJobs(limit = 5): Promise<Job[]> {
  try {
    const rows = (await sql`
      SELECT * FROM jobs
      WHERE lower(job_status) IN ('pending', 'confirmed', 'pendiente', 'confirmado')
      ORDER BY job_date ASC NULLS LAST, id DESC
      LIMIT ${limit}
    `) as Job[]
    return rows.map(normalizeJobRow)
  } catch {
    return []
  }
}
