export const REQUEST_STATUSES = ["pending_payment", "paid", "accepted", "played", "rejected", "refunded", "expired", "archived"] as const
export const PAYMENT_STATUSES = ["not_required", "pending", "processing", "paid", "failed", "cancelled", "refunded", "partially_refunded", "expired"] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export type SongPaymentStatus = (typeof PAYMENT_STATUSES)[number]
export type ServiceStatus = "open" | "paused" | "closed"

export type SongRequestSettings = {
  serviceStatus: ServiceStatus; freeRequests: boolean; priceCents: number; currency: string
  eventName: string; eventId: string; publicMessage: string; peakMode: boolean; peakMessage: string
  lastRound: boolean; dedicationsEnabled: boolean; activeRequestLimit: number | null
  queueStatus: string; blockedGenres: string; paymentProvider: string
}

export type SongRequest = {
  id: string; event_id: string; song_title: string; artist_name: string | null
  requester_name: string | null; location_label: string | null; dedication: string | null
  request_status: RequestStatus; payment_status: SongPaymentStatus; amount_cents: number
  currency: string; payment_provider: string; payment_reference: string
  checkout_session_id: string | null; payment_transaction_id: string | null
  paid_at: string | null; accepted_at: string | null; played_at: string | null
  rejected_at: string | null; refunded_at: string | null; expires_at: string | null
  created_at: string; updated_at: string
}
