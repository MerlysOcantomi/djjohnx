"use server"

import { z } from "zod"
import { requireAdmin } from "@/lib/auth"

const inputSchema = z.object({
  text: z.string().trim().min(1, "Escribe un texto para corregir").max(6000, "El texto es demasiado largo para corregirlo de una vez"),
})

type GatewayResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
}

export async function correctSpanishText(input: { text: string }) {
  await requireAdmin()
  const { text } = inputSchema.parse(input)

  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
  if (!token) {
    throw new Error("La correccion con IA no esta disponible en este entorno")
  }

  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.4",
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "Eres un corrector profesional de español. Corrige exclusivamente ortografia, tildes, gramatica, concordancia, mayusculas y puntuacion. Conserva el significado, el tono y la informacion original. No inventes, no resumas, no amplíes y no cambies nombres propios, cifras, fechas, importes, direcciones, URLs, telefonos, identificadores ni datos bancarios. Devuelve solamente el texto corregido, sin explicaciones, comillas ni encabezados.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    }),
    cache: "no-store",
  })

  const result = (await response.json().catch(() => ({}))) as GatewayResponse
  if (!response.ok) {
    throw new Error(result.error?.message || "No se pudo corregir el texto")
  }

  const corrected = result.choices?.[0]?.message?.content?.trim()
  if (!corrected) throw new Error("La IA no devolvio una correccion")

  return { text: corrected }
}
