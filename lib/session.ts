// Edge-compatible. Sin server-only ni next/headers para poder usarse en middleware.
const SESSION_VERSION = 1
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60 // 8 horas
export const COOKIE_NAME = "johnx_admin_session"

type SessionPayload = {
  v: number
  iat: number
  exp: number
  nonce: string
}

function base64url(bytes: Uint8Array): string {
  let str = ""
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64urlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4))
  const str = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes
}

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data))
  return base64url(new Uint8Array(sig))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

export async function createSessionToken(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    nonce: base64url(nonceBytes),
  }
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await hmac(body, secret)
  return `${body}.${sig}`
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!token || !secret) return false
  const parts = token.split(".")
  if (parts.length !== 2) return false
  const [body, sig] = parts
  let expectedSig: string
  try {
    expectedSig = await hmac(body, secret)
  } catch {
    return false
  }
  if (!timingSafeEqual(sig, expectedSig)) return false
  let payload: SessionPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(body)))
  } catch {
    return false
  }
  if (payload.v !== SESSION_VERSION) return false
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== "number" || payload.exp < now) return false
  return true
}

export function timingSafeCompare(a: string, b: string): boolean {
  return timingSafeEqual(a, b)
}

export async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  return base64url(new Uint8Array(digest))
}
