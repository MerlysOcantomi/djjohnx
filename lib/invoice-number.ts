/**
 * Formato de numero de factura: PREFIJO-ANIO-NUMERO, con el numero
 * rellenado a un minimo de tres digitos. Ejemplo: DJ-2026-001.
 *
 * Funciones puras, sin acceso a base de datos, para poder probarlas
 * y compartirlas entre servidor y cliente.
 */

export const INVOICE_NUMBER_PAD = 3
export const DRAFT_NUMBER = "BORRADOR"

/** Normaliza un prefijo introducido por el usuario. */
export function sanitizePrefix(raw: string | null | undefined): string {
  const cleaned = (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  return cleaned || "DJ"
}

export function formatInvoiceNumber(prefix: string, year: number, n: number): string {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : new Date().getFullYear()
  const safeN = Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1
  return `${sanitizePrefix(prefix)}-${safeYear}-${String(safeN).padStart(INVOICE_NUMBER_PAD, "0")}`
}

export type ParsedInvoiceNumber = { prefix: string; year: number; n: number }

/** Devuelve null si el texto no tiene el formato esperado. */
export function parseInvoiceNumber(value: string | null | undefined): ParsedInvoiceNumber | null {
  if (!value) return null
  const m = /^([A-Za-z0-9]+)-(\d{4})-(\d+)$/.exec(value.trim())
  if (!m) return null
  return { prefix: m[1].toUpperCase(), year: Number(m[2]), n: Number(m[3]) }
}

/** true si el numero corresponde a un borrador todavia sin numerar. */
export function isDraftNumber(value: string | null | undefined): boolean {
  return !value || value.trim() === "" || value.trim().toUpperCase() === DRAFT_NUMBER
}

/** Nombre del archivo PDF de una factura. */
export function invoicePdfFilename(number: string | null | undefined, status: string): string {
  if (status === "draft" || isDraftNumber(number)) return "Factura-JOHNX-DJ-Borrador.pdf"
  return `Factura-${number}.pdf`
}
