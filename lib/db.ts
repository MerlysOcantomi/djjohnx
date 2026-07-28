import "server-only"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

type Sql = NeonQueryFunction<false, false>

let client: Sql | null = null

/**
 * Crea el cliente la primera vez que se usa, no al importar el modulo.
 * Asi el build de produccion no necesita DATABASE_URL: si falta, el fallo
 * ocurre al ejecutar la consulta y lo capturan las funciones de lib/data.ts.
 */
function getClient(): Sql {
  if (client) return client
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL no esta configurada")
  }
  client = neon(url)
  return client
}

/**
 * Cliente SQL de Neon. Solo servidor.
 * Uso: const rows = await sql`SELECT * FROM services WHERE id = ${id}`
 * Las plantillas etiquetadas usan consultas parametrizadas automaticamente:
 * nunca concatenes datos del usuario dentro de la cadena SQL.
 */
export const sql = new Proxy(function () {} as unknown as Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getClient() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_target, prop) {
    // No instanciamos el cliente por comprobaciones internas (por ejemplo "then"
    // cuando algo intenta tratar el objeto como un thenable).
    if (prop === "then" || typeof prop === "symbol") return undefined
    const c = getClient() as unknown as Record<string, unknown>
    const value = c[prop as string]
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value
  },
}) as Sql
