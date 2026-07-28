import { describe, it, expect } from "vitest"
import {
  formatEurFromMinor,
  formatMoneyMinor,
  formatEur,
  formatQty,
  formatDateEs,
  parseEsNumber,
  eurosToMinor,
  minorToNumber,
  numberToMinor,
} from "@/lib/format"

/**
 * Intl separa el importe del simbolo con espacio duro (U+00A0) o estrecho
 * (U+202F) segun la version de ICU. Los unificamos a un espacio normal.
 */
function normalize(s: string): string {
  return s.replace(/[\u00a0\u202f]/g, " ")
}

describe("formato de moneda es-ES", () => {
  it("usa punto de millar, coma decimal y el simbolo del euro", () => {
    expect(normalize(formatEurFromMinor(125000))).toBe("1.250,00 €")
    expect(normalize(formatEurFromMinor(50000))).toBe("500,00 €")
    expect(normalize(formatEurFromMinor(7550))).toBe("75,50 €")
  })

  it("formatea el cero y los importes pequenos", () => {
    expect(normalize(formatEurFromMinor(0))).toBe("0,00 €")
    expect(normalize(formatEurFromMinor(1))).toBe("0,01 €")
  })

  it("formatea importes negativos", () => {
    expect(normalize(formatEurFromMinor(-7500))).toBe("-75,00 €")
  })

  it("formatMoneyMinor admite la divisa y usa EUR por defecto", () => {
    expect(normalize(formatMoneyMinor(50000))).toBe("500,00 €")
    expect(normalize(formatMoneyMinor(50000, "EUR"))).toBe("500,00 €")
    expect(normalize(formatMoneyMinor(50000, ""))).toBe("500,00 €")
  })

  it("formatEur no produce NaN con entradas invalidas", () => {
    expect(normalize(formatEur(Number.NaN))).toBe("0,00 €")
    expect(normalize(formatEur(Number.POSITIVE_INFINITY))).toBe("0,00 €")
  })
})

describe("conversion entre euros y centimos", () => {
  it("convierte en ambos sentidos sin errores de coma flotante", () => {
    expect(numberToMinor(350)).toBe(35000)
    expect(numberToMinor(75.5)).toBe(7550)
    expect(numberToMinor(1250)).toBe(125000)
    expect(numberToMinor(0.1 + 0.2)).toBe(30)
    expect(minorToNumber(7550)).toBe(75.5)
  })

  it("interpreta texto en formato es-ES", () => {
    expect(parseEsNumber("1.250,50")).toBe(1250.5)
    expect(parseEsNumber("500")).toBe(500)
    expect(parseEsNumber("75,50")).toBe(75.5)
    expect(parseEsNumber("")).toBe(0)
    expect(parseEsNumber("no es un numero")).toBe(0)
  })

  it("eurosToMinor acepta texto y numero", () => {
    expect(eurosToMinor("1.250,00")).toBe(125000)
    expect(eurosToMinor("75,50")).toBe(7550)
    expect(eurosToMinor(350)).toBe(35000)
    expect(eurosToMinor("")).toBe(0)
  })
})

describe("cantidades", () => {
  it("usa coma decimal y como maximo dos decimales", () => {
    expect(formatQty(1)).toBe("1")
    expect(formatQty(1.5)).toBe("1,5")
    expect(formatQty(2.25)).toBe("2,25")
  })

  it("no produce NaN", () => {
    expect(formatQty(Number.NaN)).toBe("0")
  })
})

describe("fechas", () => {
  it("formatea en es-ES", () => {
    expect(formatDateEs("2026-05-17")).toMatch(/2026/)
    expect(formatDateEs("2026-05-17").toLowerCase()).toContain("may")
  })

  it("devuelve cadena vacia si la fecha falta o es invalida", () => {
    expect(formatDateEs(null)).toBe("")
    expect(formatDateEs(undefined)).toBe("")
    expect(formatDateEs("")).toBe("")
    expect(formatDateEs("no es una fecha")).toBe("")
  })
})
