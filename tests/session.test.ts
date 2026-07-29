import { describe, it, expect, vi, afterEach } from "vitest"
import {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  sha256Base64url,
  timingSafeCompare,
} from "@/lib/session"

const SECRET = "secreto-de-prueba-suficientemente-largo-para-hmac-sha256"

afterEach(() => {
  vi.useRealTimers()
})

describe("configuracion de la cookie", () => {
  it("usa el nombre acordado y una duracion de 8 horas", () => {
    expect(COOKIE_NAME).toBe("johnx_admin_session")
    expect(SESSION_MAX_AGE_SECONDS).toBe(8 * 60 * 60)
  })
})

describe("sesion valida", () => {
  it("un token recien creado se verifica correctamente", async () => {
    const token = await createSessionToken(SECRET)
    expect(await verifySessionToken(token, SECRET)).toBe(true)
  })

  it("el token lleva version, emision, expiracion y nonce", async () => {
    const token = await createSessionToken(SECRET)
    const [body] = token.split(".")
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    expect(payload.v).toBe(1)
    expect(typeof payload.iat).toBe("number")
    expect(typeof payload.exp).toBe("number")
    expect(payload.exp - payload.iat).toBe(SESSION_MAX_AGE_SECONDS)
    expect(typeof payload.nonce).toBe("string")
    expect(payload.nonce.length).toBeGreaterThan(10)
  })

  it("dos tokens seguidos son distintos gracias al nonce", async () => {
    const a = await createSessionToken(SECRET)
    const b = await createSessionToken(SECRET)
    expect(a).not.toBe(b)
  })
})

describe("sesion invalida", () => {
  it("rechaza un token vacio o ausente", async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBe(false)
    expect(await verifySessionToken("", SECRET)).toBe(false)
  })

  it("rechaza si falta el secreto", async () => {
    const token = await createSessionToken(SECRET)
    expect(await verifySessionToken(token, undefined)).toBe(false)
    expect(await verifySessionToken(token, "")).toBe(false)
  })

  it("rechaza un token firmado con otro secreto", async () => {
    const token = await createSessionToken(SECRET)
    expect(await verifySessionToken(token, "otro-secreto-distinto")).toBe(false)
  })

  it("rechaza un token con la firma manipulada", async () => {
    const token = await createSessionToken(SECRET)
    const [body, sig] = token.split(".")
    const tampered = `${body}.${sig.slice(0, -2)}XX`
    expect(await verifySessionToken(tampered, SECRET)).toBe(false)
  })

  it("rechaza un token con el contenido manipulado", async () => {
    const token = await createSessionToken(SECRET)
    const [, sig] = token.split(".")
    const forged = Buffer.from(
      JSON.stringify({ v: 1, iat: 0, exp: 9999999999, nonce: "x" }),
      "utf8",
    ).toString("base64url")
    expect(await verifySessionToken(`${forged}.${sig}`, SECRET)).toBe(false)
  })

  it("rechaza un formato que no sea cuerpo.firma", async () => {
    expect(await verifySessionToken("sin-punto", SECRET)).toBe(false)
    expect(await verifySessionToken("a.b.c", SECRET)).toBe(false)
  })

  it("rechaza la cookie insegura del sistema antiguo", async () => {
    expect(await verifySessionToken("authenticated", SECRET)).toBe(false)
  })
})

describe("sesion caducada", () => {
  it("un token deja de valer pasadas las 8 horas", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    const token = await createSessionToken(SECRET)
    expect(await verifySessionToken(token, SECRET)).toBe(true)

    // Justo antes de expirar sigue siendo valido.
    vi.setSystemTime(new Date("2026-01-01T07:59:00Z"))
    expect(await verifySessionToken(token, SECRET)).toBe(true)

    // Una hora despues del limite ya no.
    vi.setSystemTime(new Date("2026-01-01T09:00:00Z"))
    expect(await verifySessionToken(token, SECRET)).toBe(false)
  })
})

describe("comparaciones", () => {
  it("sha256Base64url es estable y distinto por entrada", async () => {
    const a = await sha256Base64url("hola")
    const b = await sha256Base64url("hola")
    const c = await sha256Base64url("adios")
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toContain("+")
    expect(a).not.toContain("/")
    expect(a).not.toContain("=")
  })

  it("timingSafeCompare distingue iguales de distintos", () => {
    expect(timingSafeCompare("abc", "abc")).toBe(true)
    expect(timingSafeCompare("abc", "abd")).toBe(false)
    expect(timingSafeCompare("abc", "abcd")).toBe(false)
  })
})
