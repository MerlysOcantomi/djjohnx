"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"
import { DRAFT_NUMBER, parseInvoiceNumber } from "@/lib/invoice-number"

const inputSchema = z.object({
  invoiceId: z.number().int().positive(),
  number: z
    .string()
    .trim()
    .min(1, "El numero de factura es obligatorio")
    .max(64, "El numero de factura es demasiado largo")
    .refine((value) => !/[\r\n\t]/.test(value), "El numero de factura contiene caracteres no permitidos"),
})

/**
 * Cambia manualmente el numero de una factura ya emitida.
 *
 * Los borradores siguen usando la numeracion automatica al emitir. Si el
 * numero manual tiene el formato PREFIJO-ANIO-NUMERO, el contador atomico se
 * adelanta para que futuras facturas automaticas no reutilicen ese numero.
 */
export async function updateInvoiceNumber(input: { invoiceId: number; number: string }) {
  await requireAdmin()
  const data = inputSchema.parse(input)
  const number = data.number.trim()

  if (number.toUpperCase() === DRAFT_NUMBER) {
    throw new Error("BORRADOR esta reservado para facturas que todavia no se han emitido")
  }

  const currentRows = (await sql`
    SELECT id, number, status
    FROM invoices
    WHERE id = ${data.invoiceId}
    LIMIT 1
  `) as { id: number; number: string; status: string }[]

  const current = currentRows[0]
  if (!current) throw new Error("Factura no encontrada")
  if (current.status === "draft") {
    throw new Error("Los borradores reciben su numero automaticamente al emitir la factura")
  }
  if (current.number === number) return { number }

  const duplicateRows = (await sql`
    SELECT id
    FROM invoices
    WHERE number = ${number}
      AND id <> ${data.invoiceId}
      AND status <> 'draft'
    LIMIT 1
  `) as { id: number }[]

  if (duplicateRows.length > 0) {
    throw new Error(`Ya existe otra factura con el numero ${number}`)
  }

  await sql`
    UPDATE invoices
    SET number = ${number}, updated_at = now()
    WHERE id = ${data.invoiceId}
  `

  // Si se introduce, por ejemplo, DJ-2026-050, la siguiente asignacion
  // automatica debe ser como minimo 051. Nunca reducimos el contador.
  const parsed = parseInvoiceNumber(number)
  if (parsed) {
    await sql`
      INSERT INTO invoice_counters (prefix, year, next_number)
      VALUES (${parsed.prefix}, ${parsed.year}, ${parsed.n + 1})
      ON CONFLICT (prefix, year) DO UPDATE
        SET next_number = GREATEST(invoice_counters.next_number, EXCLUDED.next_number),
            updated_at = now()
    `
  }

  revalidatePath("/admin/facturas")
  revalidatePath(`/admin/facturas/${data.invoiceId}`)
  revalidatePath(`/admin/facturas/${data.invoiceId}/editar`)
  revalidatePath("/admin/trabajos")
  revalidatePath("/admin")

  return { number }
}
