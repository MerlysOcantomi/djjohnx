/** Mapeos entre valores internos (guardados) y etiquetas visibles en espanol. */

export const JOB_STATUS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Realizado",
  cancelled: "Cancelado",
} as const
export type JobStatus = keyof typeof JOB_STATUS

export const PAYMENT_STATUS = {
  not_invoiced: "No facturado",
  pending: "Pendiente de cobrar",
  partially_paid: "Parcialmente pagado",
  paid: "Pagado",
} as const
export type PaymentStatus = keyof typeof PAYMENT_STATUS

export const INVOICE_STATUS = {
  draft: "Borrador",
  issued: "Emitida",
  sent: "Enviada",
  paid: "Pagada",
  cancelled: "Anulada",
} as const
export type InvoiceStatus = keyof typeof INVOICE_STATUS

export const JOB_STATUS_KEYS = Object.keys(JOB_STATUS) as JobStatus[]
export const PAYMENT_STATUS_KEYS = Object.keys(PAYMENT_STATUS) as PaymentStatus[]
export const INVOICE_STATUS_KEYS = Object.keys(INVOICE_STATUS) as InvoiceStatus[]

/* ================== Normalizacion de valores heredados ==================
 * El esquema inicial guardaba etiquetas en espanol ('Pendiente', 'Borrador')
 * y una version antigua de las acciones escribia otras ('pendiente', 'cobrado').
 * La migracion 0002 normaliza la base de datos a las claves canonicas; estas
 * funciones ademas protegen la lectura por si quedara alguna fila sin migrar.
 */

const JOB_STATUS_ALIASES: Record<string, JobStatus> = {
  pendiente: "pending",
  confirmado: "confirmed",
  realizado: "completed",
  completado: "completed",
  cancelado: "cancelled",
}

const PAYMENT_STATUS_ALIASES: Record<string, PaymentStatus> = {
  "no facturado": "not_invoiced",
  no_facturado: "not_invoiced",
  pendiente: "pending",
  "pendiente de cobrar": "pending",
  parcial: "partially_paid",
  "parcialmente pagado": "partially_paid",
  cobrado: "paid",
  pagado: "paid",
}

const INVOICE_STATUS_ALIASES: Record<string, InvoiceStatus> = {
  borrador: "draft",
  emitida: "issued",
  enviada: "sent",
  pagada: "paid",
  anulada: "cancelled",
  cancelada: "cancelled",
}

function normalize<T extends string>(
  raw: string | null | undefined,
  canonical: readonly T[],
  aliases: Record<string, T>,
  fallback: T,
): T {
  if (!raw) return fallback
  const key = raw.trim().toLowerCase()
  if ((canonical as readonly string[]).includes(key)) return key as T
  return aliases[key] ?? fallback
}

export function normalizeJobStatus(raw: string | null | undefined): JobStatus {
  return normalize(raw, JOB_STATUS_KEYS, JOB_STATUS_ALIASES, "pending")
}
export function normalizePaymentStatus(raw: string | null | undefined): PaymentStatus {
  return normalize(raw, PAYMENT_STATUS_KEYS, PAYMENT_STATUS_ALIASES, "not_invoiced")
}
export function normalizeInvoiceStatus(raw: string | null | undefined): InvoiceStatus {
  return normalize(raw, INVOICE_STATUS_KEYS, INVOICE_STATUS_ALIASES, "draft")
}

export function jobStatusLabel(s: string): string {
  return JOB_STATUS[normalizeJobStatus(s)]
}
export function paymentStatusLabel(s: string): string {
  return PAYMENT_STATUS[normalizePaymentStatus(s)]
}
export function invoiceStatusLabel(s: string): string {
  return INVOICE_STATUS[normalizeInvoiceStatus(s)]
}
