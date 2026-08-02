import { z } from "zod"
import type { RequestStatus, SongPaymentStatus } from "./types"

const normalized = (max: number) => z.string().max(max).transform((value) => value.trim().replace(/\s+/g, " "))
export const songRequestSchema = z.object({
  songTitle: normalized(160).pipe(z.string().min(1, "Escribe el título de la canción")),
  artistName: normalized(160).optional().default(""), requesterName: normalized(80).optional().default(""),
  locationLabel: normalized(80).optional().default(""), dedication: normalized(240).optional().default(""),
  clientRequestId: z.string().uuid("No se pudo identificar el envío"), website: z.string().max(0).optional().default(""),
})

const transitions: Record<RequestStatus, RequestStatus[]> = {
  // Only the payment webhook may promote pending_payment to paid.
  pending_payment: ["expired", "archived"], paid: ["accepted", "rejected", "refunded", "archived"],
  accepted: ["played", "rejected", "refunded", "archived"], played: ["archived", "refunded"],
  rejected: ["archived", "refunded"], refunded: ["archived"], expired: ["archived"], archived: [],
}
export function canTransition(from: RequestStatus, to: RequestStatus, payment: SongPaymentStatus) {
  if (to === "played" && !["paid", "not_required"].includes(payment)) return false
  return transitions[from].includes(to)
}
export function publicPaymentState(payment: SongPaymentStatus) {
  if (payment === "paid" || payment === "not_required") return "confirmed"
  if (["failed", "cancelled", "expired"].includes(payment)) return "failed"
  return "pending"
}
