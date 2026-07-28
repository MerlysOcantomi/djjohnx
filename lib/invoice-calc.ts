/**
 * Motor de calculo de facturas. Fuente unica de verdad.
 * Todo el dinero se maneja en centimos (enteros). Las cantidades pueden ser decimales.
 * Se usa en el formulario, el servidor, la vista previa y el PDF.
 */

export type DiscountType = "none" | "percent" | "fixed"

export type CalcLine = {
  quantity: number
  unitPriceMinor: number
}

export type CalcInput = {
  lines: CalcLine[]
  discountType: DiscountType
  discountPercent: number // 0..100
  discountValueMinor: number // importe fijo en centimos
  vatEnabled: boolean
  vatPercent: number
  irpfEnabled: boolean
  irpfPercent: number
}

export type CalcResult = {
  lineTotalsMinor: number[]
  subtotalMinor: number
  discountMinor: number
  baseMinor: number
  vatMinor: number
  totalBeforeIrpfMinor: number
  irpfMinor: number
  totalMinor: number
}

function safeInt(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n)
  return Number.isFinite(v) ? Math.round(v) : 0
}

function safeNum(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n)
  return Number.isFinite(v) ? v : 0
}

function clampPercent(p: number): number {
  const v = safeNum(p)
  if (v < 0) return 0
  if (v > 100) return 100
  return v
}

/** Total de una linea en centimos: cantidad x precio unitario. */
export function lineTotalMinor(quantity: number, unitPriceMinor: number): number {
  return Math.round(safeNum(quantity) * safeInt(unitPriceMinor))
}

export function calculateInvoice(input: CalcInput): CalcResult {
  const lineTotalsMinor = input.lines.map((l) => lineTotalMinor(l.quantity, l.unitPriceMinor))
  const subtotalMinor = lineTotalsMinor.reduce((a, b) => a + b, 0)

  let discountMinor = 0
  if (input.discountType === "percent") {
    discountMinor = Math.round((subtotalMinor * clampPercent(input.discountPercent)) / 100)
  } else if (input.discountType === "fixed") {
    discountMinor = Math.max(0, safeInt(input.discountValueMinor))
  }
  discountMinor = Math.min(discountMinor, subtotalMinor)

  const baseMinor = subtotalMinor - discountMinor
  const vatMinor = input.vatEnabled ? Math.round((baseMinor * clampPercent(input.vatPercent)) / 100) : 0
  const irpfMinor = input.irpfEnabled ? Math.round((baseMinor * clampPercent(input.irpfPercent)) / 100) : 0
  const totalBeforeIrpfMinor = baseMinor + vatMinor
  const totalMinor = baseMinor + vatMinor - irpfMinor

  return {
    lineTotalsMinor,
    subtotalMinor,
    discountMinor,
    baseMinor,
    vatMinor,
    totalBeforeIrpfMinor,
    irpfMinor,
    totalMinor,
  }
}
