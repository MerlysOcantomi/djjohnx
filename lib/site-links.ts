/**
 * Enlaces a sitios hermanos de DJ JOHNX.
 *
 * La landing de IAM PROSOUND todavia no tiene URL definitiva, asi que no se
 * escribe ninguna en el codigo: se configura con la variable de entorno
 * `NEXT_PUBLIC_IAM_PROSOUND_URL`. Mientras este vacia, el acceso se muestra
 * como "Proximamente" y no enlaza a ningun sitio.
 */

/** Acepta rutas internas (`/algo`) o URLs https completas; cualquier otra cosa se descarta. */
export function sanitizeLink(value: string | undefined | null): string | null {
  const url = (value ?? "").trim()
  if (!url) return null
  if (url.startsWith("/") && !url.startsWith("//")) return url
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

export const IAM_PROSOUND_URL = sanitizeLink(process.env.NEXT_PUBLIC_IAM_PROSOUND_URL)

/** Ruta interna con todo el sitio de John (biografia, eventos, galeria...). */
export const JOHNX_PATH = "/john"
