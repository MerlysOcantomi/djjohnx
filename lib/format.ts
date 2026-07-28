/**
 * Utilidades de formato regional es-ES y manejo de dinero en centimos.
 * El dinero se guarda SIEMPRE como entero en centimos (amount_minor).
 */

/** Convierte centimos (entero) a un numero decimal en euros. */
export function minorToNumber(minor: number): number {
  return Math.round(minor) / 100
}

/** Convierte euros (numero/decimal) a centimos (entero). Evita errores de coma flotante. */
export function numberToMinor(value: number): number {
  return Math.round(value * 100)
}

/** Formatea centimos como moneda es-ES: 1.250,00 € */
export function formatEurFromMinor(minor: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(minorToNumber(minor))
}

/** Formatea un numero decimal como moneda es-ES. */
export function formatEur(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(safe)
}

/** Formatea centimos como moneda es-ES admitiendo la divisa (por defecto EUR). */
export function formatMoneyMinor(minor: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(minorToNumber(minor))
}

/** Formatea una cantidad (permite decimales) en es-ES: 1, 1,5, 2,25 */
export function formatQty(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(safe)
}

/** Formatea una fecha ISO como es-ES: 17 may 2026 */
export function formatDateEs(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d)
}

/** Formatea fecha larga es-ES: jueves, 17 de mayo de 2026 */
export function formatDateLongEs(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

/** Parsea un texto de importe en formato es-ES (1.250,50) a numero. */
export function parseEsNumber(input: string): number {
  if (!input) return 0
  const normalized = input.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

/** Convierte un texto de euros en formato es-ES (o numero) a centimos enteros. */
export function eurosToMinor(input: string | number): number {
  const value = typeof input === "number" ? input : parseEsNumber(input)
  return numberToMinor(value)
}
