"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  isAdminConfigured,
} from "@/lib/auth"

const loginSchema = z.object({
  password: z.string().min(1).max(200),
})

/**
 * Limitacion de intentos en memoria (best-effort por instancia).
 * Se cuenta por IP: con una clave unica global, ocho intentos fallidos de
 * cualquiera dejarian al administrador sin poder entrar durante la ventana.
 */
const attempts = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8
const MAX_TRACKED_IPS = 1000

async function clientKey(): Promise<string> {
  try {
    const h = await headers()
    const forwarded = h.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim()
    return ip || "desconocida"
  } catch {
    return "desconocida"
  }
}

function purgeExpired(now: number) {
  for (const [key, rec] of attempts) {
    if (now - rec.first > WINDOW_MS) attempts.delete(key)
  }
}

function rateLimited(key: string): boolean {
  const now = Date.now()
  const rec = attempts.get(key)
  if (!rec) return false
  if (now - rec.first > WINDOW_MS) {
    attempts.delete(key)
    return false
  }
  return rec.count >= MAX_ATTEMPTS
}

function registerAttempt(key: string) {
  const now = Date.now()
  // Evita que el mapa crezca sin limite si llegan muchas IP distintas.
  if (attempts.size > MAX_TRACKED_IPS) purgeExpired(now)
  const rec = attempts.get(key)
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now })
  } else {
    rec.count += 1
  }
}

export type LoginState = { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    // Se registra que falta configuracion, nunca su contenido.
    console.error(
      "[auth] Falta ADMIN_PASSWORD o SESSION_SECRET en las variables de entorno; se deniega el acceso.",
    )
    return { error: "La configuracion del panel no esta completa. Contacta con el administrador." }
  }

  const parsed = loginSchema.safeParse({ password: formData.get("password") })
  if (!parsed.success) {
    return { error: "Contrasena no valida." }
  }

  const key = await clientKey()
  if (rateLimited(key)) {
    return { error: "Demasiados intentos. Espera unos minutos e intentalo de nuevo." }
  }

  const ok = await verifyPassword(parsed.data.password)
  if (!ok) {
    registerAttempt(key)
    // Pequeno retraso para dificultar ataques automaticos
    await new Promise((r) => setTimeout(r, 500))
    return { error: "Contrasena incorrecta." }
  }

  attempts.delete(key)
  await setSessionCookie()
  redirect("/admin")
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect("/admin/login")
}
