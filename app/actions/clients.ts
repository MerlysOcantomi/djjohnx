"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"
import { sql } from "@/lib/db"

const limited = (max: number) => z.string().trim().max(max).optional().default("")
const clientSchema = z.object({
  id: z.number().int().positive().optional(),
  kind: z.enum(["person", "company"]).default("person"),
  displayName: z.string().trim().min(1, "Indica el nombre del cliente").max(200),
  legalName: limited(200), contactName: limited(200), taxId: limited(40),
  address: limited(300), postalCode: limited(25), city: limited(120),
  province: limited(120), country: limited(120), email: limited(200),
  phone: limited(100), bankHolder: limited(200), bankIban: limited(45),
  bankBic: limited(25), notes: limited(2000),
})

const nullable = (value: string) => value || null

export async function saveClient(input: unknown) {
  await requireAdmin()
  const d = clientSchema.parse(input)
  const taxId = d.taxId ? d.taxId.toUpperCase().replace(/\s+/g, "") : ""
  if (d.email && !z.string().email().safeParse(d.email).success) {
    throw new Error("Revisa la direccion de correo")
  }
  if (d.bankIban && !/^[A-Z]{2}[0-9A-Z ]{10,43}$/i.test(d.bankIban)) {
    throw new Error("Revisa el formato del IBAN")
  }
  if (taxId) {
    const duplicate = await sql`SELECT id FROM clients
      WHERE upper(replace(tax_id, ' ', '')) = ${taxId} AND id <> ${d.id ?? 0} LIMIT 1` as { id: number }[]
    if (duplicate.length) throw new Error("Ya existe otro cliente con ese NIF/CIF")
  }
  let id = d.id
  if (id) {
    const updated = await sql`
      UPDATE clients SET kind = ${d.kind}, display_name = ${d.displayName},
        legal_name = ${nullable(d.legalName)}, contact_name = ${nullable(d.contactName)},
        tax_id = ${nullable(taxId)}, address = ${nullable(d.address)},
        postal_code = ${nullable(d.postalCode)}, city = ${nullable(d.city)},
        province = ${nullable(d.province)}, country = ${nullable(d.country)},
        email = ${nullable(d.email)}, phone = ${nullable(d.phone)},
        bank_holder = ${nullable(d.bankHolder)}, bank_iban = ${nullable(d.bankIban)},
        bank_bic = ${nullable(d.bankBic)}, notes = ${nullable(d.notes)}, updated_at = now()
      WHERE id = ${id} RETURNING id
    ` as { id: number }[]
    if (!updated.length) throw new Error("Cliente no encontrado")
  } else {
    const inserted = await sql`
      INSERT INTO clients (kind, display_name, legal_name, contact_name, tax_id,
        address, postal_code, city, province, country, email, phone,
        bank_holder, bank_iban, bank_bic, notes)
      VALUES (${d.kind}, ${d.displayName}, ${nullable(d.legalName)},
        ${nullable(d.contactName)}, ${nullable(taxId)},
        ${nullable(d.address)}, ${nullable(d.postalCode)}, ${nullable(d.city)},
        ${nullable(d.province)}, ${nullable(d.country)}, ${nullable(d.email)},
        ${nullable(d.phone)}, ${nullable(d.bankHolder)}, ${nullable(d.bankIban)},
        ${nullable(d.bankBic)}, ${nullable(d.notes)}) RETURNING id
    ` as { id: number }[]
    id = inserted[0].id
  }
  revalidatePath("/admin/clientes")
  revalidatePath("/admin/trabajos")
  revalidatePath("/admin/facturas/nueva")
  return { id: id! }
}
