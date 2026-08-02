import { createHmac, timingSafeEqual } from "node:crypto"
import type { SongPaymentStatus } from "./types"

export type CheckoutInput = { requestId: string; reference: string; amountCents: number; currency: string; returnUrl: string }
export type Checkout = { sessionId: string; checkoutUrl: string }
export type VerifiedPaymentEvent = { eventId: string; reference: string; transactionId?: string; amountCents: number; currency: string; status: SongPaymentStatus }
export interface PaymentProvider {
  readonly name: string; readonly supportsRefunds: boolean
  createCheckout(input: CheckoutInput): Promise<Checkout>
  verifyWebhook(rawBody: string, signature: string): VerifiedPaymentEvent
  getPaymentStatus(reference: string): Promise<SongPaymentStatus>
  refundPayment?(transactionId: string, amountCents: number): Promise<void>
}

export function isTestProviderAllowed(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "production" && env.SONG_REQUEST_TEST_PAYMENT_ENABLED === "true"
}
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
export class TestPaymentProvider implements PaymentProvider {
  readonly name = "test"; readonly supportsRefunds = true
  constructor(private secret: string, private appUrl: string, private env: NodeJS.ProcessEnv = process.env) {
    if (!isTestProviderAllowed(env)) throw new Error("TEST_PAYMENT_PROVIDER_DISABLED")
    if (!secret) throw new Error("TEST_WEBHOOK_SECRET_MISSING")
  }
  async createCheckout(input: CheckoutInput): Promise<Checkout> {
    const sessionId = `test_${crypto.randomUUID()}`
    return { sessionId, checkoutUrl: `${this.appUrl}/api/song-requests/test-checkout?request=${encodeURIComponent(input.requestId)}&session=${encodeURIComponent(sessionId)}` }
  }
  verifyWebhook(rawBody: string, signature: string): VerifiedPaymentEvent {
    const expected = createHmac("sha256", this.secret).update(rawBody).digest("hex")
    if (!safeEqual(expected, signature)) throw new Error("INVALID_WEBHOOK_SIGNATURE")
    return zEvent(JSON.parse(rawBody))
  }
  async getPaymentStatus() { return "pending" as const }
  async refundPayment() {}
  sign(rawBody: string) { return createHmac("sha256", this.secret).update(rawBody).digest("hex") }
}
function zEvent(value: unknown): VerifiedPaymentEvent {
  if (!value || typeof value !== "object") throw new Error("INVALID_WEBHOOK")
  const v = value as Record<string, unknown>
  const allowed = ["pending", "processing", "paid", "failed", "cancelled", "refunded"]
  if (typeof v.eventId !== "string" || typeof v.reference !== "string" || typeof v.amountCents !== "number" || typeof v.currency !== "string" || !allowed.includes(String(v.status))) throw new Error("INVALID_WEBHOOK")
  return v as VerifiedPaymentEvent
}

export function getPaymentProvider() {
  const provider = process.env.SONG_REQUEST_PAYMENT_PROVIDER || "test"
  if (provider !== "test") throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED")
  return new TestPaymentProvider(process.env.SONG_REQUEST_WEBHOOK_SECRET || "", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
}
