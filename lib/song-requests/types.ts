export const ROUND_STATUSES = ["open", "paused", "full", "last_round", "closed"] as const
export const PASS_STATUSES = ["created", "pending_manual_payment", "payment_reported", "paid", "song_selection_open", "songs_submitted", "queued", "played", "payment_not_found", "expired", "cancelled", "archived"] as const
export type RoundStatus = (typeof ROUND_STATUSES)[number]
export type PassStatus = (typeof PASS_STATUSES)[number]

export type SongRequestRound = { id:string; name:string; status:RoundStatus; capacity:number; reserved_slots:number; message:string; created_at:string; updated_at:string }
export type SongRequestPass = { id:string; round_id:string; public_reference:string; bizum_name:string; whatsapp_number:string; amount_cents:number; reserved_song_count:number; payment_mode:"manual_bizum"; status:PassStatus; payment_reported_at:string|null; paid_at:string|null; confirmed_by:string|null; expires_at:string; created_at:string; updated_at:string }
export type SongRequestItem = { id:string; song_request_id:string; position:number; title:string; artist:string|null; status:"queued"|"played"; played_at:string|null; spotify_track_id:string|null; spotify_track_url:string|null; artwork_url:string|null; version_label:string|null }
export type PublicRound = { status:RoundStatus; capacity:number; occupied:number; available:number; percent:number; message:string }
export type ManualBizumConfig = { enabled:boolean; contactName:string; phone:string; minAmountCents:number; tokenSecretConfigured:boolean; available:boolean }
