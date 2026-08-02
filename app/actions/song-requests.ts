"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdminSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { canTransition } from "@/lib/song-requests/domain"
import { getSongRequest,updateRequestStatus } from "@/lib/song-requests/data"
import { REQUEST_STATUSES } from "@/lib/song-requests/types"
const settingsSchema=z.object({serviceStatus:z.enum(["open","paused","closed"]),freeRequests:z.boolean(),priceCents:z.number().int().min(0).max(100000),currency:z.string().regex(/^[A-Z]{3}$/),eventName:z.string().trim().min(1).max(120),eventId:z.string().trim().min(1).max(80),publicMessage:z.string().trim().max(500),peakMode:z.boolean(),peakMessage:z.string().trim().max(500),lastRound:z.boolean(),dedicationsEnabled:z.boolean(),activeRequestLimit:z.number().int().min(1).max(10000).nullable(),queueStatus:z.string().trim().max(120),blockedGenres:z.string().trim().max(300)})
export async function saveSongRequestSettingsAction(input:unknown){await requireAdminSession();const d=settingsSchema.parse(input);await sql`UPDATE song_request_settings SET service_status=${d.serviceStatus},free_requests=${d.freeRequests},price_cents=${d.priceCents},currency=${d.currency},event_name=${d.eventName},event_id=${d.eventId},public_message=${d.publicMessage},peak_mode=${d.peakMode},peak_message=${d.peakMessage},last_round=${d.lastRound},dedications_enabled=${d.dedicationsEnabled},active_request_limit=${d.activeRequestLimit},queue_status=${d.queueStatus},blocked_genres=${d.blockedGenres},updated_at=now() WHERE id=1`;revalidatePath("/mi-cancion");revalidatePath("/admin/solicitudes");return{ok:true}}
export async function transitionSongRequestAction(input:unknown){await requireAdminSession();const d=z.object({id:z.string().uuid(),to:z.enum(REQUEST_STATUSES)}).parse(input);const item=await getSongRequest(d.id);if(!item||!canTransition(item.request_status,d.to,item.payment_status))throw new Error("Transición de estado no permitida");const updated=await updateRequestStatus(d.id,item.request_status,d.to);if(!updated)throw new Error("La petición cambió; actualiza la página");revalidatePath("/admin/solicitudes");return{ok:true}}
