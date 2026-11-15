import { NextResponse } from "next/server"
import { z } from "zod"
import { isAuthenticated } from "@/lib/auth"

export const runtime = "nodejs"
export const maxDuration = 60

const schema = z.object({
  concept: z.string().trim().min(4).max(400),
  style: z.enum(["neon", "minimal", "smoke"]),
})
const promptStyles = {
  neon: "premium electronic music nightclub photography, electric blue and violet rim lighting, dramatic high contrast, stylish dancefloor haze",
  minimal: "minimalist black editorial art direction, sculptural stage lights, deep neutral tones, premium contemporary music poster photography",
  smoke: "moody black nightclub with subtle volumetric smoke, deep blue and violet laser beams, elegant dramatic atmosphere",
}
function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } })
}

/**
 * Genera SOLAMENTE el fondo. Los titulos, fechas y lugares quedan como texto
 * vectorial editable en el navegador: no se le pide a la IA que escriba.
 * Nunca se invoca automaticamente: solo al pulsar "Generar fondo".
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return fail("No autorizado", 401)
  const input = schema.safeParse(await request.json().catch(() => null))
  if (!input.success) return fail("Describe el concepto y selecciona un estilo", 400)
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
  if (!token) return fail("Falta configurar AI Gateway en Vercel. Puedes usar las plantillas sin IA.", 503)
  const model = process.env.POSTER_IMAGE_MODEL || "minimax/minimax-h3-image-highspeed"
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55_000)
    let response: Response
    try {
      response = await fetch("https://ai-gateway.vercel.sh/v1/images/generations", {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: [
            "Create a premium, photographic background for a professional DJ event poster.",
            "Portrait composition with visual interest in the upper third, plenty of dark negative space in the center and bottom for typography added later.",
            "No text, no letters, no symbols that resemble text, no logos, no watermarks, no fake event details.",
            "No faces of real people. Sophisticated, cinematic, art-directed, not generic clip art.",
            promptStyles[input.data.style],
            "Creative direction: " + input.data.concept,
          ].join(" "),
          size: "1024x1536",
          n: 1,
          response_format: "b64_json",
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    const result = await response.json().catch(() => ({})) as {
      data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
      error?: { message?: string }
    }
    if (!response.ok) {
      console.error("Poster AI Gateway error", response.status, result.error?.message)
      return fail("El proveedor de imágenes no pudo generar el fondo. Reintenta o utiliza una imagen propia.", 502)
    }
    const item = result.data?.[0]
    if (item?.b64_json && item.b64_json.length < 18_000_000)
      return NextResponse.json({ image: "data:image/png;base64," + item.b64_json }, { headers: { "Cache-Control": "no-store" } })
    // URLs remotas pueden requerir autenticacion o no permitir uso en canvas;
    // se descargan desde el servidor y se entregan como data URI a nuestro editor.
    if (item?.url) {
      const url = new URL(item.url)
      if (url.protocol !== "https:") return fail("Imagen generada no disponible", 502)
      const imageResponse = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) })
      const type = imageResponse.headers.get("content-type") || ""
      if (!imageResponse.ok || !type.startsWith("image/")) return fail("No se pudo recuperar la imagen", 502)
      const bytes = Buffer.from(await imageResponse.arrayBuffer())
      if (bytes.length > 12_000_000) return fail("Imagen demasiado grande", 502)
      return NextResponse.json({ image: "data:" + type.split(";")[0] + ";base64," + bytes.toString("base64") }, { headers: { "Cache-Control": "no-store" } })
    }
    return fail("Este modelo no devolvió una imagen compatible. Prueba otro modelo en POSTER_IMAGE_MODEL.", 502)
  } catch {
    return fail("No se pudo completar la generación. Inténtalo de nuevo.", 502)
  }
}
