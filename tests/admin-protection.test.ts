import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import {
  JOB_STATUS,
  PAYMENT_STATUS,
  INVOICE_STATUS,
  jobStatusLabel,
  paymentStatusLabel,
  invoiceStatusLabel,
  normalizeJobStatus,
  normalizePaymentStatus,
  normalizeInvoiceStatus,
} from "@/lib/status"

const ACTIONS_DIR = join(process.cwd(), "app/actions")

function actionFiles(): string[] {
  return readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts"))
}

/**
 * Extrae el cuerpo de cada funcion exportada asincrona de un modulo
 * "use server", para comprobar que todas verifican la sesion.
 */
function exportedActions(source: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = []
  const re = /export async function (\w+)\s*\([^)]*\)[^{]*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const start = re.lastIndex
    let depth = 1
    let i = start
    while (i < source.length && depth > 0) {
      const c = source[i]
      if (c === "{") depth++
      else if (c === "}") depth--
      i++
    }
    out.push({ name: m[1], body: source.slice(start, i) })
  }
  return out
}

describe("proteccion de las Server Actions privadas", () => {
  const files = actionFiles()

  it("hay modulos de acciones que revisar", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8")
    const isServerModule = source.includes('"use server"')
    const actions = exportedActions(source)

    describe(file, () => {
      it("es un modulo de servidor", () => {
        expect(isServerModule).toBe(true)
      })

      for (const action of actions) {
        // El login y el logout son publicos por definicion: son la puerta de entrada.
        const isPublicByDesign = file === "auth.ts" && ["loginAction", "logoutAction"].includes(action.name)

        it(`${action.name} ${isPublicByDesign ? "es publica a proposito" : "exige sesion de administrador"}`, () => {
          const guarded = /await require(AdminSession|Admin)\(\)/.test(action.body)
          expect(guarded).toBe(isPublicByDesign ? false : true)
        })
      }
    })
  }

  it("ninguna accion importa el cliente de Neon en un modulo de cliente", () => {
    for (const file of files) {
      const source = readFileSync(join(ACTIONS_DIR, file), "utf8")
      expect(source.includes('"use client"')).toBe(false)
    }
  })

  // En un modulo "use server" Next.js convierte cada export en una referencia
  // de servidor. Si se exporta una constante y un Client Component la importa,
  // en el navegador no recibe el valor sino un proxy: por ejemplo un array
  // exportado asi fallaba con "map is not a function" al abrir "Nuevo trabajo".
  // Las constantes compartidas van en lib/, no aqui.
  for (const file of files) {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8")
    it(`${file} solo exporta funciones asincronas y tipos`, () => {
      const valueExports = source
        .split("\n")
        .filter((line) => /^export\s+(const|let|var|class|enum|function)\b/.test(line))
        .filter((line) => !/^export\s+async\s+function\b/.test(line))
      expect(valueExports).toEqual([])
    })
  }
})

describe("estados: claves canonicas y etiquetas en espanol", () => {
  it("los estados de trabajo son los acordados", () => {
    expect(Object.keys(JOB_STATUS)).toEqual(["pending", "confirmed", "completed", "cancelled"])
    expect(jobStatusLabel("pending")).toBe("Pendiente")
    expect(jobStatusLabel("confirmed")).toBe("Confirmado")
    expect(jobStatusLabel("completed")).toBe("Realizado")
    expect(jobStatusLabel("cancelled")).toBe("Cancelado")
  })

  it("los estados de pago son los acordados", () => {
    expect(Object.keys(PAYMENT_STATUS)).toEqual(["not_invoiced", "pending", "partially_paid", "paid"])
    expect(paymentStatusLabel("not_invoiced")).toBe("No facturado")
    expect(paymentStatusLabel("pending")).toBe("Pendiente de cobrar")
    expect(paymentStatusLabel("partially_paid")).toBe("Parcialmente pagado")
    expect(paymentStatusLabel("paid")).toBe("Pagado")
  })

  it("los estados de factura son los acordados", () => {
    expect(Object.keys(INVOICE_STATUS)).toEqual(["draft", "issued", "sent", "paid", "cancelled"])
    expect(invoiceStatusLabel("draft")).toBe("Borrador")
    expect(invoiceStatusLabel("issued")).toBe("Emitida")
    expect(invoiceStatusLabel("sent")).toBe("Enviada")
    expect(invoiceStatusLabel("paid")).toBe("Pagada")
    expect(invoiceStatusLabel("cancelled")).toBe("Anulada")
  })
})

describe("normalizacion de valores heredados", () => {
  it("convierte los estados de trabajo en espanol", () => {
    expect(normalizeJobStatus("Pendiente")).toBe("pending")
    expect(normalizeJobStatus("pendiente")).toBe("pending")
    expect(normalizeJobStatus("Confirmado")).toBe("confirmed")
    expect(normalizeJobStatus("realizado")).toBe("completed")
    expect(normalizeJobStatus("Cancelado")).toBe("cancelled")
  })

  it("convierte los estados de pago de las dos versiones antiguas", () => {
    expect(normalizePaymentStatus("No facturado")).toBe("not_invoiced")
    expect(normalizePaymentStatus("pendiente")).toBe("pending")
    expect(normalizePaymentStatus("parcial")).toBe("partially_paid")
    expect(normalizePaymentStatus("cobrado")).toBe("paid")
  })

  it("convierte los estados de factura en espanol", () => {
    expect(normalizeInvoiceStatus("Borrador")).toBe("draft")
    expect(normalizeInvoiceStatus("Emitida")).toBe("issued")
    expect(normalizeInvoiceStatus("Anulada")).toBe("cancelled")
  })

  it("deja intactos los valores ya canonicos", () => {
    expect(normalizeJobStatus("completed")).toBe("completed")
    expect(normalizePaymentStatus("partially_paid")).toBe("partially_paid")
    expect(normalizeInvoiceStatus("sent")).toBe("sent")
  })

  it("usa un valor seguro ante datos desconocidos o vacios", () => {
    expect(normalizeJobStatus("vete a saber")).toBe("pending")
    expect(normalizeJobStatus(null)).toBe("pending")
    expect(normalizePaymentStatus(undefined)).toBe("not_invoiced")
    expect(normalizeInvoiceStatus("")).toBe("draft")
  })
})
