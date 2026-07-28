import "server-only"
import { getPublicContent } from "@/lib/data"

/**
 * Devuelve el contenido publico leyendo desde Neon.
 * Mantiene la misma forma que consumen los componentes publicos.
 */
export async function getSiteContent() {
  try {
    return await getPublicContent()
  } catch (e) {
    console.warn("[v0] getSiteContent fallo:", (e as Error).message)
    return null
  }
}
