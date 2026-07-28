"use server"

import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { eurosToMinor } from "@/lib/format"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { JOB_STATUS_KEYS, type JobStatus, type PaymentStatus } from "@/lib/status"

export const JOB_STATUSES = JOB_STATUS_KEYS as readonly JobStatus[]

/**
 * Deriva el estado de pago a partir de los importes.
 * Sin factura vinculada y sin cobros, el trabajo esta "No facturado".
 */
function paymentStatusFor(amountMinor: number, paidMinor: number, hasInvoice: boolean): PaymentStatus {
  if (amountMinor > 0 && paidMinor >= amountMinor) return "paid"
  if (paidMinor > 0) return "partially_paid"
  return hasInvoice ? "pending" : "not_invoiced"
}

function revalidateAll() {
  revalidatePath("/admin/trabajos")
  revalidatePath("/admin")
  revalidatePath("/admin/facturas")
}

const jobSchema = z.object({
  id: z.number().int().positive().optional(),
  jobDate: z.string().optional().default(""),
  clientName: z.string().min(1, "El cliente es obligatorio").max(200),
  company: z.string().max(200).optional().default(""),
  venue: z.string().max(200).optional().default(""),
  address: z.string().max(300).optional().default(""),
  concept: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  startTime: z.string().max(20).optional().default(""),
  endTime: z.string().max(20).optional().default(""),
  amountEuros: z.string().optional().default(""),
  paidEuros: z.string().optional().default(""),
  jobStatus: z.enum(JOB_STATUS_KEYS as [JobStatus, ...JobStatus[]]).optional().default("pending"),
  notes: z.string().max(2000).optional().default(""),
})

export async function saveJob(input: unknown) {
  await requireAdmin()
  const d = jobSchema.parse(input)
  const amount = d.amountEuros ? eurosToMinor(d.amountEuros) : 0
  const paid = d.paidEuros ? eurosToMinor(d.paidEuros) : 0
  const date = d.jobDate || null

  if (d.id) {
    // Conservamos la distincion "No facturado" / "Pendiente de cobrar".
    const linked = (await sql`SELECT invoice_id FROM jobs WHERE id = ${d.id}`) as {
      invoice_id: number | null
    }[]
    const paymentStatus = paymentStatusFor(amount, paid, Boolean(linked[0]?.invoice_id))
    await sql`
      UPDATE jobs SET
        job_date = ${date}, client_name = ${d.clientName}, company = ${d.company || null},
        venue = ${d.venue || null}, address = ${d.address || null}, concept = ${d.concept || null},
        description = ${d.description || null}, start_time = ${d.startTime || null}, end_time = ${d.endTime || null},
        amount_minor = ${amount}, paid_minor = ${paid}, job_status = ${d.jobStatus},
        payment_status = ${paymentStatus}, notes = ${d.notes || null}, updated_at = now()
      WHERE id = ${d.id}
    `
  } else {
    const paymentStatus = paymentStatusFor(amount, paid, false)
    await sql`
      INSERT INTO jobs (job_date, client_name, company, venue, address, concept, description,
        start_time, end_time, amount_minor, paid_minor, job_status, payment_status, notes)
      VALUES (${date}, ${d.clientName}, ${d.company || null}, ${d.venue || null}, ${d.address || null},
        ${d.concept || null}, ${d.description || null}, ${d.startTime || null}, ${d.endTime || null},
        ${amount}, ${paid}, ${d.jobStatus}, ${paymentStatus}, ${d.notes || null})
    `
  }
  revalidateAll()
  return { ok: true }
}

export async function setJobStatus(id: number, status: JobStatus) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  z.enum(JOB_STATUS_KEYS as [JobStatus, ...JobStatus[]]).parse(status)
  await sql`UPDATE jobs SET job_status = ${status}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

/** Registra un cobro: suma al total pagado y recalcula el estado de pago. */
export async function registerPayment(id: number, amountEuros: string) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  const add = eurosToMinor(amountEuros)
  const rows = (await sql`SELECT amount_minor, paid_minor, invoice_id FROM jobs WHERE id = ${id}`) as {
    amount_minor: number
    paid_minor: number
    invoice_id: number | null
  }[]
  const job = rows[0]
  if (!job) throw new Error("No encontrado")
  const newPaid = Math.max(0, job.paid_minor + add)
  const status = paymentStatusFor(job.amount_minor, newPaid, Boolean(job.invoice_id))
  await sql`UPDATE jobs SET paid_minor = ${newPaid}, payment_status = ${status}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

/** Marca como totalmente cobrado. */
export async function markFullyPaid(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`UPDATE jobs SET paid_minor = amount_minor, payment_status = 'paid', updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

export async function deleteJob(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`DELETE FROM jobs WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}
