"use server"

import { z } from "zod"
import { sql } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateInvoice, type DiscountType } from "@/lib/invoice-calc"
import { getSettings } from "@/lib/data"

const lineSchema = z.object({
  id: z.number().optional(),
  serviceDate: z.string().nullable().optional(),
  concept: z.string().trim().min(1, "El concepto es obligatorio"),
  description: z.string().nullable().optional(),
  quantity: z.number().finite().min(0),
  unitPriceMinor: z.number().int().min(0),
})

const invoiceSchema = z.object({
  id: z.number().optional(),
  status: z.enum(["draft", "issued", "sent", "paid", "cancelled"]).default("draft"),
  issueDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  currency: z.string().default("EUR"),
  jobId: z.number().nullable().optional(),
  client: z.object({
    name: z.string().nullable().optional(),
    taxId: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountPercent: z.number().min(0).max(100).default(0),
  discountValueMinor: z.number().int().min(0).default(0),
  vatEnabled: z.boolean().default(true),
  vatPercent: z.number().min(0).max(100).default(21),
  irpfEnabled: z.boolean().default(false),
  irpfPercent: z.number().min(0).max(100).default(15),
  payment: z.object({
    method: z.string().nullable().optional(),
    holder: z.string().nullable().optional(),
    iban: z.string().nullable().optional(),
    bic: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    terms: z.string().nullable().optional(),
    clientNotes: z.string().nullable().optional(),
    internalNotes: z.string().nullable().optional(),
  }),
  lines: z.array(lineSchema).default([]),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>

function n(v: string | null | undefined) {
  const t = (v ?? "").trim()
  return t === "" ? null : t
}

/**
 * Asigna el siguiente numero de factura de forma atomica.
 *
 * Un unico INSERT ... ON CONFLICT DO UPDATE ... RETURNING incrementa y
 * devuelve el contador en la misma sentencia, asi que dos emisiones
 * simultaneas nunca reciben el mismo numero. Los numeros anulados no se
 * reutilizan porque el contador solo avanza.
 *
 * `startAt` es el "siguiente numero" configurado en /admin/configuracion y
 * solo se aplica la primera vez que se usa un prefijo en un anio.
 */
export async function assignInvoiceNumber(prefix: string, startAt = 1): Promise<string> {
  const year = new Date().getFullYear()
  const first = Number.isFinite(startAt) && startAt > 0 ? Math.floor(startAt) : 1
  const rows = (await sql`
    INSERT INTO invoice_counters (prefix, year, next_number)
    VALUES (${prefix}, ${year}, ${first + 1})
    ON CONFLICT (prefix, year) DO UPDATE
      SET next_number = invoice_counters.next_number + 1,
          updated_at = now()
    RETURNING next_number - 1 AS assigned
  `) as { assigned: number }[]
  const assigned = rows[0]?.assigned ?? first
  return `${prefix}-${year}-${String(assigned).padStart(3, "0")}`
}

async function persistInvoice(input: InvoiceInput, issue: boolean) {
  await requireAdmin()
  const data = invoiceSchema.parse(input)

  const calc = calculateInvoice({
    lines: data.lines.map((l) => ({ quantity: l.quantity, unitPriceMinor: l.unitPriceMinor })),
    discountType: data.discountType as DiscountType,
    discountPercent: data.discountPercent,
    discountValueMinor: data.discountValueMinor,
    vatEnabled: data.vatEnabled,
    vatPercent: data.vatPercent,
    irpfEnabled: data.irpfEnabled,
    irpfPercent: data.irpfPercent,
  })

  // Al emitir se exige cliente y al menos una linea valida.
  if (issue) {
    if (!n(data.client.name)) throw new Error("Falta el nombre del cliente para emitir la factura")
    if (data.lines.length === 0) throw new Error("Anade al menos una linea para emitir la factura")
  }

  let invoiceId = data.id ?? null
  let number = ""
  let status = data.status

  if (issue) {
    // Solo se numera al emitir; los borradores no consumen numero.
    // Si la factura ya tenia numero definitivo, se conserva.
    const current = invoiceId
      ? ((await sql`SELECT number, status FROM invoices WHERE id = ${invoiceId}`) as {
          number: string
          status: string
        }[])[0]
      : undefined
    if (current && current.number && current.number !== "BORRADOR") {
      number = current.number
    } else {
      const settings = await getSettings()
      number = await assignInvoiceNumber(settings.billing.prefix || "DJ", settings.billing.nextNumber)
    }
    status = "issued"
  }

  if (invoiceId) {
    // Recuperar numero existente si ya lo tenia (no reasignar salvo emision).
    const existing = (await sql`SELECT number, status FROM invoices WHERE id = ${invoiceId}`) as {
      number: string
      status: string
    }[]
    if (existing[0] && !issue) {
      number = existing[0].number
      status = data.status
    }

    await sql`
      UPDATE invoices SET
        number = ${number || (existing[0]?.number ?? "")},
        status = ${status},
        issue_date = ${n(data.issueDate)},
        due_date = ${n(data.dueDate)},
        currency = ${data.currency},
        job_id = ${data.jobId ?? null},
        client_name = ${n(data.client.name)},
        client_tax_id = ${n(data.client.taxId)},
        client_address = ${n(data.client.address)},
        client_postal_code = ${n(data.client.postalCode)},
        client_city = ${n(data.client.city)},
        client_province = ${n(data.client.province)},
        client_country = ${n(data.client.country)},
        client_email = ${n(data.client.email)},
        client_phone = ${n(data.client.phone)},
        discount_type = ${data.discountType},
        discount_value_minor = ${data.discountValueMinor},
        discount_percent = ${data.discountPercent},
        vat_enabled = ${data.vatEnabled},
        vat_percent = ${data.vatPercent},
        irpf_enabled = ${data.irpfEnabled},
        irpf_percent = ${data.irpfPercent},
        subtotal_minor = ${calc.subtotalMinor},
        discount_minor = ${calc.discountMinor},
        base_minor = ${calc.baseMinor},
        vat_minor = ${calc.vatMinor},
        irpf_minor = ${calc.irpfMinor},
        total_minor = ${calc.totalMinor},
        payment_method = ${n(data.payment.method)},
        payment_holder = ${n(data.payment.holder)},
        payment_iban = ${n(data.payment.iban)},
        payment_bic = ${n(data.payment.bic)},
        payment_reference = ${n(data.payment.reference)},
        payment_terms = ${n(data.payment.terms)},
        client_notes = ${n(data.payment.clientNotes)},
        internal_notes = ${n(data.payment.internalNotes)},
        updated_at = now()
      WHERE id = ${invoiceId}
    `
  } else {
    const inserted = (await sql`
      INSERT INTO invoices (
        number, status, issue_date, due_date, currency, job_id,
        client_name, client_tax_id, client_address, client_postal_code, client_city,
        client_province, client_country, client_email, client_phone,
        discount_type, discount_value_minor, discount_percent,
        vat_enabled, vat_percent, irpf_enabled, irpf_percent,
        subtotal_minor, discount_minor, base_minor, vat_minor, irpf_minor, total_minor,
        payment_method, payment_holder, payment_iban, payment_bic, payment_reference,
        payment_terms, client_notes, internal_notes
      ) VALUES (
        ${number || "BORRADOR"}, ${status}, ${n(data.issueDate)}, ${n(data.dueDate)}, ${data.currency}, ${data.jobId ?? null},
        ${n(data.client.name)}, ${n(data.client.taxId)}, ${n(data.client.address)}, ${n(data.client.postalCode)}, ${n(data.client.city)},
        ${n(data.client.province)}, ${n(data.client.country)}, ${n(data.client.email)}, ${n(data.client.phone)},
        ${data.discountType}, ${data.discountValueMinor}, ${data.discountPercent},
        ${data.vatEnabled}, ${data.vatPercent}, ${data.irpfEnabled}, ${data.irpfPercent},
        ${calc.subtotalMinor}, ${calc.discountMinor}, ${calc.baseMinor}, ${calc.vatMinor}, ${calc.irpfMinor}, ${calc.totalMinor},
        ${n(data.payment.method)}, ${n(data.payment.holder)}, ${n(data.payment.iban)}, ${n(data.payment.bic)}, ${n(data.payment.reference)},
        ${n(data.payment.terms)}, ${n(data.payment.clientNotes)}, ${n(data.payment.internalNotes)}
      ) RETURNING id
    `) as { id: number }[]
    invoiceId = inserted[0].id
  }

  // Reescribir lineas.
  await sql`DELETE FROM invoice_items WHERE invoice_id = ${invoiceId}`
  for (let i = 0; i < data.lines.length; i++) {
    const l = data.lines[i]
    const lineTotal = Math.round(l.quantity * l.unitPriceMinor)
    await sql`
      INSERT INTO invoice_items (invoice_id, service_date, concept, description, quantity, unit_price_minor, total_minor, sort_order)
      VALUES (${invoiceId}, ${n(l.serviceDate)}, ${l.concept}, ${n(l.description)}, ${l.quantity}, ${l.unitPriceMinor}, ${lineTotal}, ${i})
    `
  }

  // Vincular con el trabajo si procede.
  if (data.jobId) {
    await sql`
      UPDATE jobs SET invoice_id = ${invoiceId},
        payment_status = CASE
          WHEN lower(payment_status) IN ('not_invoiced', 'no facturado') THEN 'pending'
          ELSE payment_status END,
        updated_at = now()
      WHERE id = ${data.jobId}
    `
  }

  revalidatePath("/admin/facturas")
  revalidatePath(`/admin/facturas/${invoiceId}`)
  revalidatePath("/admin/trabajos")
  revalidatePath("/admin")
  return { id: invoiceId as number, number }
}

export async function saveInvoice(input: InvoiceInput) {
  return persistInvoice(input, false)
}

export async function issueInvoice(input: InvoiceInput) {
  return persistInvoice(input, true)
}

export async function setInvoiceStatus(id: number, status: "draft" | "issued" | "sent" | "paid" | "cancelled") {
  await requireAdmin()
  await sql`UPDATE invoices SET status = ${status}, updated_at = now() WHERE id = ${id}`
  // Si se marca pagada y hay trabajo vinculado, reflejar cobro completo.
  if (status === "paid") {
    const rows = (await sql`SELECT job_id, total_minor FROM invoices WHERE id = ${id}`) as {
      job_id: number | null
      total_minor: number
    }[]
    const inv = rows[0]
    if (inv?.job_id) {
      await sql`
        UPDATE jobs SET paid_minor = amount_minor, payment_status = 'paid', updated_at = now()
        WHERE id = ${inv.job_id}
      `
    }
  }
  revalidatePath("/admin/facturas")
  revalidatePath(`/admin/facturas/${id}`)
  revalidatePath("/admin/trabajos")
  revalidatePath("/admin")
}

export async function duplicateInvoice(id: number) {
  await requireAdmin()
  const inv = (await sql`SELECT * FROM invoices WHERE id = ${id}`) as Record<string, unknown>[]
  if (!inv[0]) throw new Error("Factura no encontrada")
  const s = inv[0] as Record<string, unknown>
  const created = (await sql`
    INSERT INTO invoices (
      number, status, issue_date, due_date, currency,
      client_name, client_tax_id, client_address, client_postal_code, client_city,
      client_province, client_country, client_email, client_phone,
      discount_type, discount_value_minor, discount_percent,
      vat_enabled, vat_percent, irpf_enabled, irpf_percent,
      subtotal_minor, discount_minor, base_minor, vat_minor, irpf_minor, total_minor,
      payment_method, payment_holder, payment_iban, payment_bic, payment_reference,
      payment_terms, client_notes, internal_notes
    ) VALUES (
      'BORRADOR', 'draft', ${null}, ${null}, ${s.currency},
      ${s.client_name}, ${s.client_tax_id}, ${s.client_address}, ${s.client_postal_code}, ${s.client_city},
      ${s.client_province}, ${s.client_country}, ${s.client_email}, ${s.client_phone},
      ${s.discount_type}, ${s.discount_value_minor}, ${s.discount_percent},
      ${s.vat_enabled}, ${s.vat_percent}, ${s.irpf_enabled}, ${s.irpf_percent},
      ${s.subtotal_minor}, ${s.discount_minor}, ${s.base_minor}, ${s.vat_minor}, ${s.irpf_minor}, ${s.total_minor},
      ${s.payment_method}, ${s.payment_holder}, ${s.payment_iban}, ${s.payment_bic}, ${s.payment_reference},
      ${s.payment_terms}, ${s.client_notes}, ${s.internal_notes}
    ) RETURNING id
  `) as { id: number }[]
  const newId = created[0].id
  await sql`
    INSERT INTO invoice_items (invoice_id, service_date, concept, description, quantity, unit_price_minor, total_minor, sort_order)
    SELECT ${newId}, service_date, concept, description, quantity, unit_price_minor, total_minor, sort_order
    FROM invoice_items WHERE invoice_id = ${id}
  `
  revalidatePath("/admin/facturas")
  redirect(`/admin/facturas/${newId}/editar`)
}

export async function deleteInvoice(id: number) {
  await requireAdmin()
  // Solo se permiten eliminar borradores.
  const rows = (await sql`SELECT status, job_id FROM invoices WHERE id = ${id}`) as {
    status: string
    job_id: number | null
  }[]
  if (!rows[0]) return
  if (rows[0].status !== "draft") throw new Error("Solo se pueden eliminar borradores. Anula la factura en su lugar.")
  if (rows[0].job_id) {
    await sql`
      UPDATE jobs SET invoice_id = NULL,
        payment_status = CASE
          WHEN lower(payment_status) IN ('pending', 'pendiente') THEN 'not_invoiced'
          ELSE payment_status END,
        updated_at = now()
      WHERE id = ${rows[0].job_id}
    `
  }
  await sql`DELETE FROM invoices WHERE id = ${id}`
  revalidatePath("/admin/facturas")
  revalidatePath("/admin/trabajos")
}

export async function createInvoiceFromJob(jobId: number) {
  await requireAdmin()
  const jobs = (await sql`SELECT * FROM jobs WHERE id = ${jobId}`) as Record<string, unknown>[]
  const job = jobs[0]
  if (!job) throw new Error("Trabajo no encontrado")

  // Si ya tiene factura, ir a ella.
  if (job.invoice_id) {
    redirect(`/admin/facturas/${job.invoice_id as number}/editar`)
  }

  const settings = await getSettings()
  const concept = (job.concept as string) || "Servicio de DJ"
  const amount = (job.amount_minor as number) || 0

  // Mismo motor de calculo que el resto de la aplicacion (Fase 12).
  const calc = calculateInvoice({
    lines: [{ quantity: 1, unitPriceMinor: amount }],
    discountType: "none",
    discountPercent: 0,
    discountValueMinor: 0,
    vatEnabled: true,
    vatPercent: settings.billing.vatPercent,
    irpfEnabled: false,
    irpfPercent: settings.billing.irpfPercent,
  })

  const clientName = (job.client_name as string) || (job.company as string) || null
  const created = (await sql`
    INSERT INTO invoices (
      number, status, issue_date, currency, job_id,
      client_name, client_address, discount_type, vat_enabled, vat_percent, irpf_enabled, irpf_percent,
      subtotal_minor, discount_minor, base_minor, vat_minor, irpf_minor, total_minor,
      payment_holder, payment_iban, payment_bic, payment_terms, client_notes
    ) VALUES (
      'BORRADOR', 'draft', ${new Date().toISOString().slice(0, 10)}, ${settings.billing.currency}, ${jobId},
      ${clientName}, ${(job.address as string) || null}, 'none', true, ${settings.billing.vatPercent}, false, ${settings.billing.irpfPercent},
      ${calc.subtotalMinor}, ${calc.discountMinor}, ${calc.baseMinor}, ${calc.vatMinor}, ${calc.irpfMinor}, ${calc.totalMinor},
      ${settings.billing.bankHolder || null}, ${settings.billing.iban || null}, ${settings.billing.bic || null},
      ${settings.billing.paymentTerms || null}, ${settings.billing.conditions || null}
    ) RETURNING id
  `) as { id: number }[]
  const newId = created[0].id
  await sql`
    INSERT INTO invoice_items (invoice_id, service_date, concept, description, quantity, unit_price_minor, total_minor, sort_order)
    VALUES (${newId}, ${(job.job_date as string) || null}, ${concept}, ${(job.description as string) || null}, 1, ${amount}, ${amount}, 0)
  `
  await sql`
    UPDATE jobs SET invoice_id = ${newId},
      payment_status = CASE WHEN payment_status = 'not_invoiced' THEN 'pending' ELSE payment_status END,
      updated_at = now()
    WHERE id = ${jobId}
  `
  revalidatePath("/admin/facturas")
  revalidatePath("/admin/trabajos")
  redirect(`/admin/facturas/${newId}/editar`)
}
