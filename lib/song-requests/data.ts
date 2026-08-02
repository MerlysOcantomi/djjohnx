import "server-only"
import { randomUUID } from "node:crypto"
import { sql } from "@/lib/db"
import type { SongRequest, SongRequestSettings, RequestStatus, SongPaymentStatus } from "./types"

export const DEFAULT_SONG_REQUEST_SETTINGS: SongRequestSettings = {
  serviceStatus: "open", freeRequests: false, priceCents: 100, currency: "EUR",
  eventName: "Noche DJ John", eventId: "current", publicMessage: "", peakMode: false,
  peakMessage: "Estamos en hora punta. DJ John recibirá tu canción y decidirá el mejor momento.",
  lastRound: false, dedicationsEnabled: true, activeRequestLimit: null, queueStatus: "",
  blockedGenres: "", paymentProvider: "test",
}
type SettingsRow = { service_status:string; free_requests:boolean; price_cents:number; currency:string; event_name:string; event_id:string; public_message:string; peak_mode:boolean; peak_message:string; last_round:boolean; dedications_enabled:boolean; active_request_limit:number|null; queue_status:string; blocked_genres:string; payment_provider:string }
function mapSettings(r: SettingsRow): SongRequestSettings { return { serviceStatus:r.service_status, freeRequests:r.free_requests, priceCents:r.price_cents, currency:r.currency, eventName:r.event_name, eventId:r.event_id, publicMessage:r.public_message, peakMode:r.peak_mode, peakMessage:r.peak_message, lastRound:r.last_round, dedicationsEnabled:r.dedications_enabled, activeRequestLimit:r.active_request_limit, queueStatus:r.queue_status, blockedGenres:r.blocked_genres, paymentProvider:r.payment_provider } as SongRequestSettings }
export async function getSongRequestSettings() { const rows = await sql`SELECT * FROM song_request_settings WHERE id=1` as SettingsRow[]; return rows[0] ? mapSettings(rows[0]) : DEFAULT_SONG_REQUEST_SETTINGS }
export async function getPublicSongRequestSettings() { try { return await getSongRequestSettings() } catch { return { ...DEFAULT_SONG_REQUEST_SETTINGS, serviceStatus: "closed" as const, publicMessage: "Las solicitudes no están disponibles ahora mismo." } } }
export async function activeRequestCount(eventId:string) { const rows=await sql`SELECT count(*)::int count FROM song_requests WHERE event_id=${eventId} AND request_status IN ('paid','accepted')` as {count:number}[]; return rows[0]?.count || 0 }

export async function createSongRequest(input:{songTitle:string;artistName:string;requesterName:string;locationLabel:string;dedication:string;clientRequestId:string}, settings:SongRequestSettings) {
  const id=randomUUID(), reference=`DJX-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,8).toUpperCase()}`
  const free=settings.freeRequests || settings.priceCents===0
  const rows=await sql`
    INSERT INTO song_requests (id,event_id,song_title,artist_name,requester_name,location_label,dedication,request_status,payment_status,amount_cents,currency,payment_provider,payment_reference,client_request_id,paid_at,expires_at)
    VALUES (${id},${settings.eventId},${input.songTitle},${input.artistName||null},${input.requesterName||null},${input.locationLabel||null},${settings.dedicationsEnabled ? input.dedication||null:null},${free?'paid':'pending_payment'},${free?'not_required':'pending'},${free?0:settings.priceCents},${settings.currency},${free?'none':settings.paymentProvider},${reference},${input.clientRequestId},${free?new Date().toISOString():null},${new Date(Date.now()+30*60_000).toISOString()})
    ON CONFLICT (client_request_id) DO UPDATE SET updated_at=song_requests.updated_at
    RETURNING *` as SongRequest[]
  return rows[0]
}
export async function setCheckout(requestId:string, sessionId:string) { const rows=await sql`UPDATE song_requests SET checkout_session_id=COALESCE(checkout_session_id,${sessionId}),updated_at=now() WHERE id=${requestId} RETURNING *` as SongRequest[]; return rows[0] }
export async function getSongRequest(id:string) { const rows=await sql`SELECT * FROM song_requests WHERE id=${id}` as SongRequest[]; return rows[0] || null }
export async function listSongRequests() { return await sql`SELECT * FROM song_requests ORDER BY CASE request_status WHEN 'paid' THEN 1 WHEN 'accepted' THEN 2 WHEN 'played' THEN 3 WHEN 'rejected' THEN 4 ELSE 5 END, paid_at ASC NULLS LAST, created_at DESC` as SongRequest[] }
export async function updateRequestStatus(id:string, from:RequestStatus, to:RequestStatus) { const column=to==='accepted'?'accepted_at':to==='played'?'played_at':to==='rejected'?'rejected_at':null; const rows=column ? await sql`UPDATE song_requests SET request_status=${to},accepted_at=CASE WHEN ${column}='accepted_at' THEN now() ELSE accepted_at END,played_at=CASE WHEN ${column}='played_at' THEN now() ELSE played_at END,rejected_at=CASE WHEN ${column}='rejected_at' THEN now() ELSE rejected_at END,updated_at=now() WHERE id=${id} AND request_status=${from} RETURNING *` : await sql`UPDATE song_requests SET request_status=${to},updated_at=now() WHERE id=${id} AND request_status=${from} RETURNING *`; return (rows as SongRequest[])[0] }
export async function applyPaymentEvent(provider:string,event:{eventId:string;reference:string;transactionId?:string;amountCents:number;currency:string;status:SongPaymentStatus}) {
  const matches=await sql`SELECT id FROM song_requests WHERE payment_reference=${event.reference} AND amount_cents=${event.amountCents} AND currency=${event.currency} AND payment_provider=${provider}` as {id:string}[]
  if(!matches.length) throw new Error("PAYMENT_DETAILS_MISMATCH")
  const inserted=await sql`INSERT INTO song_request_webhook_events(provider,event_id) VALUES(${provider},${event.eventId}) ON CONFLICT DO NOTHING RETURNING event_id` as {event_id:string}[]
  if(!inserted.length) return {duplicate:true}
  const rows=await sql`UPDATE song_requests SET payment_status=${event.status},payment_transaction_id=COALESCE(payment_transaction_id,${event.transactionId||null}),request_status=CASE WHEN ${event.status}='paid' AND request_status='pending_payment' THEN 'paid' WHEN ${event.status}='refunded' THEN 'refunded' ELSE request_status END,paid_at=CASE WHEN ${event.status}='paid' THEN COALESCE(paid_at,now()) ELSE paid_at END,refunded_at=CASE WHEN ${event.status}='refunded' THEN COALESCE(refunded_at,now()) ELSE refunded_at END,updated_at=now() WHERE payment_reference=${event.reference} AND amount_cents=${event.amountCents} AND currency=${event.currency} AND payment_provider=${provider} RETURNING id` as {id:string}[]
  if(!rows.length) throw new Error("PAYMENT_UPDATE_CONFLICT")
  return {duplicate:false,id:rows[0].id}
}
