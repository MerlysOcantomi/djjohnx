"use server"

import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { eurosToMinor } from "@/lib/format"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export const JOB_STATUSES = ["pendiente", "confirmado", "realizado", "cancelado"] as const

function paymentStatusFor(amountMinor: number, paidMinor: number): string {
  if (paidMinor <= 0) return "pendiente"
  if (paidMinor >= amountMinor) return "cobrado"
  return "parcial"
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
  jobStatus: z.enum(JOB_STATUSES).optional().default("pendiente"),
  notes: z.string().max(2000).optional().default(""),
})

export async function saveJob(input: unknown) {
  await requireAdmin()
  const d = jobSchema.parse(input)
  const amount = d.amountEuros ? eurosToMinor(d.amountEuros) : 0
  const paid = d.paidEuros ? eurosToMinor(d.paidEuros) : 0
  const paymentStatus = paymentStatusFor(amount, paid)
  const date = d.jobDate || null

  if (d.id) {
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

export async function setJobStatus(id: number, status: (typeof JOB_STATUSES)[number]) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  z.enum(JOB_STATUSES).parse(status)
  await sql`UPDATE jobs SET job_status = ${status}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

/** Registra un cobro: suma al total pagado y recalcula el estado de pago. */
export async function registerPayment(id: number, amountEuros: string) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  const add = eurosToMinor(amountEuros)
  const rows = (await sql`SELECT amount_minor, paid_minor FROM jobs WHERE id = ${id}`) as {
    amount_minor: number
    paid_minor: number
  }[]
  const job = rows[0]
  if (!job) throw new Error("No encontrado")
  const newPaid = Math.max(0, job.paid_minor + add)
  const status = paymentStatusFor(job.amount_minor, newPaid)
  await sql`UPDATE jobs SET paid_minor = ${newPaid}, payment_status = ${status}, updated_at = now() WHERE id = ${id}`
  revalidateAll()
  return { ok: true }
}

/** Marca como totalmente cobrado. */
export async function markFullyPaid(id: number) {
  await requireAdmin()
  z.number().int().positive().parse(id)
  await sql`UPDATE jobs SET paid_minor = amount_minor, payment_status = 'cobrado', updated_at = now() WHERE id = ${id}`
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
