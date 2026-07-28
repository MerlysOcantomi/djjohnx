"use server"

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

// Limitacion simple de intentos en memoria (best-effort por instancia)
const attempts = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8

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
    return { error: "La configuracion del panel no esta completa. Contacta con el administrador." }
  }

  const parsed = loginSchema.safeParse({ password: formData.get("password") })
  if (!parsed.success) {
    return { error: "Contrasena no valida." }
  }

  const key = "global"
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
