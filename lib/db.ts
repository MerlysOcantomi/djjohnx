import "server-only"
import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  // No lanzamos en import para permitir el build; las funciones que lo usen fallaran de forma controlada.
  console.warn("[v0] DATABASE_URL no esta configurada")
}

/**
 * Cliente SQL de Neon. Solo servidor.
 * Uso: const rows = await sql`SELECT * FROM services WHERE id = ${id}`
 * Las plantillas etiquetadas usan consultas parametrizadas automaticamente.
 */
export const sql = neon(process.env.DATABASE_URL || "")
