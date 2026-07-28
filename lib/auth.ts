import "server-only"
import { cookies } from "next/headers"
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  timingSafeCompare,
  sha256Base64url,
} from "@/lib/session"

export async function setSessionCookie(): Promise<void> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("CONFIG_MISSING_SESSION_SECRET")
  const token = await createSessionToken(secret)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  return verifySessionToken(token, process.env.SESSION_SECRET)
}

// Lanza si no hay sesion valida. Usar en Server Actions y Route Handlers.
export async function requireAdminSession(): Promise<void> {
  const ok = await isAuthenticated()
  if (!ok) throw new Error("UNAUTHORIZED")
}

// Alias corto usado por las Server Actions.
export const requireAdmin = requireAdminSession

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET)
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  // Comparar hashes en tiempo constante para no filtrar longitud
  const [a, b] = await Promise.all([sha256Base64url(password), sha256Base64url(expected)])
  return timingSafeCompare(a, b)
}

export { COOKIE_NAME, SESSION_MAX_AGE_SECONDS }
