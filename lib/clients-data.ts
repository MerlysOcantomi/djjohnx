import "server-only"
import { sql } from "@/lib/db"
import type { Client, ClientLookup } from "@/lib/client-model"

export async function getClients(): Promise<Client[]> {
  return await sql`SELECT * FROM clients ORDER BY display_name ASC, id ASC` as Client[]
}

export async function getClientLookups(): Promise<ClientLookup[]> {
  try {
    return await sql`SELECT id, kind, display_name, legal_name, contact_name,
      tax_id, address, postal_code, city, province, country, email, phone
      FROM clients ORDER BY display_name ASC` as ClientLookup[]
  } catch (error) {
    console.error("[clientes] No se pudo cargar el selector:", error)
    return []
  }
}
