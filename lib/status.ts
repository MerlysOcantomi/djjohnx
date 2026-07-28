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

export function jobStatusLabel(s: string): string {
  return (JOB_STATUS as Record<string, string>)[s] ?? s
}
export function paymentStatusLabel(s: string): string {
  return (PAYMENT_STATUS as Record<string, string>)[s] ?? s
}
export function invoiceStatusLabel(s: string): string {
  return (INVOICE_STATUS as Record<string, string>)[s] ?? s
}
