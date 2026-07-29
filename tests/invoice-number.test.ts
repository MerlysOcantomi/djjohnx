import { describe, it, expect } from "vitest"
import {
  formatInvoiceNumber,
  parseInvoiceNumber,
  isDraftNumber,
  sanitizePrefix,
  invoicePdfFilename,
  DRAFT_NUMBER,
} from "@/lib/invoice-number"

describe("formato del numero de factura", () => {
  it("usa PREFIJO-ANIO-NUMERO con tres digitos", () => {
    expect(formatInvoiceNumber("DJ", 2026, 1)).toBe("DJ-2026-001")
    expect(formatInvoiceNumber("DJ", 2026, 42)).toBe("DJ-2026-042")
    expect(formatInvoiceNumber("DJ", 2026, 999)).toBe("DJ-2026-999")
  })

  it("no trunca a partir de mil", () => {
    expect(formatInvoiceNumber("DJ", 2026, 1000)).toBe("DJ-2026-1000")
  })

  it("el prefijo es configurable", () => {
    expect(formatInvoiceNumber("JOHNX", 2026, 7)).toBe("JOHNX-2026-007")
  })

  it("normaliza prefijos con espacios, minusculas o simbolos", () => {
    expect(sanitizePrefix(" dj ")).toBe("DJ")
    expect(sanitizePrefix("dj-x")).toBe("DJX")
    expect(sanitizePrefix("")).toBe("DJ")
    expect(sanitizePrefix(null)).toBe("DJ")
  })

  it("tolera entradas numericas invalidas", () => {
    expect(formatInvoiceNumber("DJ", 2026, 0)).toBe("DJ-2026-001")
    expect(formatInvoiceNumber("DJ", 2026, -5)).toBe("DJ-2026-001")
    expect(formatInvoiceNumber("DJ", 2026, Number.NaN)).toBe("DJ-2026-001")
  })
})

describe("lectura del numero de factura", () => {
  it("descompone un numero valido", () => {
    expect(parseInvoiceNumber("DJ-2026-001")).toEqual({ prefix: "DJ", year: 2026, n: 1 })
    expect(parseInvoiceNumber("JOHNX-2025-123")).toEqual({ prefix: "JOHNX", year: 2025, n: 123 })
  })

  it("devuelve null si el formato no encaja", () => {
    expect(parseInvoiceNumber(DRAFT_NUMBER)).toBeNull()
    expect(parseInvoiceNumber("DJ-26-1")).toBeNull()
    expect(parseInvoiceNumber("")).toBeNull()
    expect(parseInvoiceNumber(null)).toBeNull()
  })

  it("da la vuelta al formato sin perder informacion", () => {
    const parsed = parseInvoiceNumber("DJ-2026-007")!
    expect(formatInvoiceNumber(parsed.prefix, parsed.year, parsed.n)).toBe("DJ-2026-007")
  })
})

describe("borradores", () => {
  it("reconoce un borrador sin numerar", () => {
    expect(isDraftNumber(DRAFT_NUMBER)).toBe(true)
    expect(isDraftNumber("")).toBe(true)
    expect(isDraftNumber(null)).toBe(true)
    expect(isDraftNumber("  borrador  ")).toBe(true)
  })

  it("una factura numerada no es un borrador", () => {
    expect(isDraftNumber("DJ-2026-001")).toBe(false)
  })
})

describe("nombre del PDF", () => {
  it("usa el numero cuando la factura esta emitida", () => {
    expect(invoicePdfFilename("DJ-2026-001", "issued")).toBe("Factura-DJ-2026-001.pdf")
    expect(invoicePdfFilename("DJ-2026-001", "paid")).toBe("Factura-DJ-2026-001.pdf")
  })

  it("usa el nombre de borrador cuando aun no esta emitida", () => {
    expect(invoicePdfFilename(DRAFT_NUMBER, "draft")).toBe("Factura-JOHNX-DJ-Borrador.pdf")
    expect(invoicePdfFilename("DJ-2026-001", "draft")).toBe("Factura-JOHNX-DJ-Borrador.pdf")
    expect(invoicePdfFilename(null, "issued")).toBe("Factura-JOHNX-DJ-Borrador.pdf")
  })
})
