import { describe, it, expect } from "vitest"
import { calculateInvoice, lineTotalMinor, type CalcInput } from "@/lib/invoice-calc"

/** Base sin descuento, sin IVA y sin IRPF. Se sobrescribe en cada prueba. */
function input(over: Partial<CalcInput> = {}): CalcInput {
  return {
    lines: [],
    discountType: "none",
    discountPercent: 0,
    discountValueMinor: 0,
    vatEnabled: false,
    vatPercent: 21,
    irpfEnabled: false,
    irpfPercent: 15,
    ...over,
  }
}

describe("total de una linea", () => {
  it("multiplica cantidad por precio unitario en centimos", () => {
    expect(lineTotalMinor(1, 35000)).toBe(35000)
    expect(lineTotalMinor(3, 15000)).toBe(45000)
  })

  it("admite cantidades decimales y redondea a centimos enteros", () => {
    expect(lineTotalMinor(1.5, 10000)).toBe(15000)
    expect(lineTotalMinor(2.5, 7550)).toBe(18875)
    // 0,1 x 333 = 33,3 centimos -> 33
    expect(lineTotalMinor(0.1, 333)).toBe(33)
  })

  it("nunca devuelve NaN ni Infinity", () => {
    expect(lineTotalMinor(Number.NaN, 1000)).toBe(0)
    expect(lineTotalMinor(Number.POSITIVE_INFINITY, 1000)).toBe(0)
    expect(lineTotalMinor(1, Number.NaN)).toBe(0)
  })
})

describe("una sola linea", () => {
  it("calcula el subtotal y la base imponible", () => {
    const r = calculateInvoice(input({ lines: [{ quantity: 1, unitPriceMinor: 50000 }] }))
    expect(r.subtotalMinor).toBe(50000)
    expect(r.baseMinor).toBe(50000)
    expect(r.totalMinor).toBe(50000)
  })
})

describe("varias lineas", () => {
  it("suma todas las lineas", () => {
    const r = calculateInvoice(
      input({
        lines: [
          { quantity: 1, unitPriceMinor: 35000 },
          { quantity: 2, unitPriceMinor: 15000 },
          { quantity: 1, unitPriceMinor: 7550 },
        ],
      }),
    )
    expect(r.lineTotalsMinor).toEqual([35000, 30000, 7550])
    expect(r.subtotalMinor).toBe(72550)
  })

  it("una factura sin lineas da todo a cero", () => {
    const r = calculateInvoice(input())
    expect(r.subtotalMinor).toBe(0)
    expect(r.baseMinor).toBe(0)
    expect(r.totalMinor).toBe(0)
  })
})

describe("descuentos", () => {
  it("aplica un descuento porcentual sobre el subtotal", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        discountType: "percent",
        discountPercent: 10,
      }),
    )
    expect(r.discountMinor).toBe(5000)
    expect(r.baseMinor).toBe(45000)
  })

  it("aplica un descuento de importe fijo", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        discountType: "fixed",
        discountValueMinor: 7500,
      }),
    )
    expect(r.discountMinor).toBe(7500)
    expect(r.baseMinor).toBe(42500)
  })

  it("el descuento nunca supera el subtotal ni genera una base negativa", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 10000 }],
        discountType: "fixed",
        discountValueMinor: 999999,
      }),
    )
    expect(r.discountMinor).toBe(10000)
    expect(r.baseMinor).toBe(0)
    expect(r.totalMinor).toBe(0)
  })

  it("un porcentaje fuera de rango se limita a 0..100", () => {
    const negativo = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        discountType: "percent",
        discountPercent: -20,
      }),
    )
    expect(negativo.discountMinor).toBe(0)

    const excesivo = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        discountType: "percent",
        discountPercent: 500,
      }),
    )
    expect(excesivo.discountMinor).toBe(50000)
  })
})

describe("IVA", () => {
  it("el IVA del 21 % se suma a la base imponible", () => {
    const r = calculateInvoice(
      input({ lines: [{ quantity: 1, unitPriceMinor: 50000 }], vatEnabled: true, vatPercent: 21 }),
    )
    expect(r.vatMinor).toBe(10500)
    expect(r.totalBeforeIrpfMinor).toBe(60500)
    expect(r.totalMinor).toBe(60500)
  })

  it("desactivado no suma nada", () => {
    const r = calculateInvoice(
      input({ lines: [{ quantity: 1, unitPriceMinor: 50000 }], vatEnabled: false, vatPercent: 21 }),
    )
    expect(r.vatMinor).toBe(0)
  })

  it("se calcula despues del descuento", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        discountType: "percent",
        discountPercent: 10,
        vatEnabled: true,
        vatPercent: 21,
      }),
    )
    // base 45000 -> IVA 9450
    expect(r.baseMinor).toBe(45000)
    expect(r.vatMinor).toBe(9450)
  })
})

describe("IRPF", () => {
  it("la retencion del 15 % se resta", () => {
    const r = calculateInvoice(
      input({ lines: [{ quantity: 1, unitPriceMinor: 50000 }], irpfEnabled: true, irpfPercent: 15 }),
    )
    expect(r.irpfMinor).toBe(7500)
    expect(r.totalMinor).toBe(42500)
  })

  it("la retencion del 7 % se resta", () => {
    const r = calculateInvoice(
      input({ lines: [{ quantity: 1, unitPriceMinor: 50000 }], irpfEnabled: true, irpfPercent: 7 }),
    )
    expect(r.irpfMinor).toBe(3500)
    expect(r.totalMinor).toBe(46500)
  })

  it("se calcula sobre la base imponible, no sobre el total con IVA", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        vatEnabled: true,
        vatPercent: 21,
        irpfEnabled: true,
        irpfPercent: 15,
      }),
    )
    expect(r.irpfMinor).toBe(7500) // 15 % de 50000, no de 60500
  })
})

describe("IVA e IRPF juntos", () => {
  it("reproduce el ejemplo de referencia", () => {
    // Base 500,00 € | IVA 21 % +105,00 € | antes de retencion 605,00 €
    // IRPF 15 % -75,00 € | TOTAL 530,00 €
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 1, unitPriceMinor: 50000 }],
        vatEnabled: true,
        vatPercent: 21,
        irpfEnabled: true,
        irpfPercent: 15,
      }),
    )
    expect(r.baseMinor).toBe(50000)
    expect(r.vatMinor).toBe(10500)
    expect(r.totalBeforeIrpfMinor).toBe(60500)
    expect(r.irpfMinor).toBe(7500)
    expect(r.totalMinor).toBe(53000)
  })

  it("con descuento, IVA e IRPF a la vez", () => {
    const r = calculateInvoice(
      input({
        lines: [
          { quantity: 2, unitPriceMinor: 30000 },
          { quantity: 1, unitPriceMinor: 20000 },
        ],
        discountType: "fixed",
        discountValueMinor: 10000,
        vatEnabled: true,
        vatPercent: 21,
        irpfEnabled: true,
        irpfPercent: 7,
      }),
    )
    expect(r.subtotalMinor).toBe(80000)
    expect(r.discountMinor).toBe(10000)
    expect(r.baseMinor).toBe(70000)
    expect(r.vatMinor).toBe(14700)
    expect(r.irpfMinor).toBe(4900)
    expect(r.totalMinor).toBe(79800)
  })
})

describe("redondeos", () => {
  it("los importes resultantes son siempre enteros", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: 3, unitPriceMinor: 3333 }],
        discountType: "percent",
        discountPercent: 7.5,
        vatEnabled: true,
        vatPercent: 21,
        irpfEnabled: true,
        irpfPercent: 15,
      }),
    )
    for (const v of [r.subtotalMinor, r.discountMinor, r.baseMinor, r.vatMinor, r.irpfMinor, r.totalMinor]) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it("no arrastra errores de coma flotante", () => {
    // 0,1 + 0,2 en euros seria 0,30000000000000004 con float
    const r = calculateInvoice(input({ lines: [{ quantity: 1, unitPriceMinor: 10 }, { quantity: 1, unitPriceMinor: 20 }] }))
    expect(r.subtotalMinor).toBe(30)
  })

  it("un IVA del 21 % sobre un importe impar redondea a la baja correctamente", () => {
    // 21 % de 10,01 € = 2,1021 € -> 210 centimos
    const r = calculateInvoice(
      input({ lines: [{ quantity: 1, unitPriceMinor: 1001 }], vatEnabled: true, vatPercent: 21 }),
    )
    expect(r.vatMinor).toBe(210)
  })
})

describe("entradas invalidas", () => {
  it("cantidades vacias o no numericas cuentan como cero", () => {
    const r = calculateInvoice(
      input({
        lines: [
          { quantity: Number.NaN, unitPriceMinor: 50000 },
          { quantity: 1, unitPriceMinor: 25000 },
        ],
      }),
    )
    expect(r.subtotalMinor).toBe(25000)
    expect(Number.isNaN(r.totalMinor)).toBe(false)
  })

  it("ningun importe resulta NaN ni Infinity con entradas corruptas", () => {
    const r = calculateInvoice(
      input({
        lines: [{ quantity: Number.POSITIVE_INFINITY, unitPriceMinor: Number.NaN }],
        discountType: "percent",
        discountPercent: Number.NaN,
        vatEnabled: true,
        vatPercent: Number.POSITIVE_INFINITY,
        irpfEnabled: true,
        irpfPercent: Number.NaN,
      }),
    )
    for (const v of Object.values(r)) {
      if (typeof v === "number") expect(Number.isFinite(v)).toBe(true)
    }
  })
})
