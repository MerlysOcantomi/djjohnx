"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdminSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { archivePass, confirmManualPayment, createRound, markItemPlayed, releasePass, setRoundStatus, updateRoundCapacity, updateSongItem } from "@/lib/song-requests/data"
import { buildConfirmationMessage, buildWhatsappUrl } from "@/lib/song-requests/domain"
import { decryptToken } from "@/lib/song-requests/token"
import { ROUND_STATUSES } from "@/lib/song-requests/types"

function refresh() { revalidatePath("/admin/solicitudes"); revalidatePath("/mi-cancion"); revalidatePath("/mi-cancion/live") }
async function prepareWhatsApp(id: string, allowedStatuses: string[]) {
  const rows = await sql`SELECT public_reference,bizum_name,whatsapp_number,reserved_song_count,private_token_encrypted,status,payment_mode FROM song_requests WHERE id=${id}` as { public_reference:string; bizum_name:string; whatsapp_number:string; reserved_song_count:number; private_token_encrypted:string; status:string; payment_mode:string }[]
  const pass = rows[0]
  if (!pass || pass.payment_mode !== "manual_bizum" || !allowedStatuses.includes(pass.status)) throw new Error("El pase no permite este aviso")
  const token = decryptToken(pass.private_token_encrypted)
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://djjohnx.com").replace(/\/$/, "")
  const privateUrl = `${base}/mi-cancion/pase/${token}`
  return buildWhatsappUrl(pass.whatsapp_number, buildConfirmationMessage({ name:pass.bizum_name, reference:pass.public_reference, songCount:pass.reserved_song_count, privateUrl }))
}
export async function confirmManualBizumAction(input: unknown) { await requireAdminSession(); const {id}=z.object({id:z.string().uuid()}).parse(input); const whatsappUrl=await prepareWhatsApp(id,["payment_reported","song_selection_open"]); if(!await confirmManualPayment(id,"admin"))throw new Error("No se pudo confirmar"); refresh(); return {whatsappUrl} }
export async function resendManualBizumWhatsAppAction(input: unknown) { await requireAdminSession(); const {id}=z.object({id:z.string().uuid()}).parse(input); return {whatsappUrl:await prepareWhatsApp(id,["song_selection_open"])} }
export async function markPaymentNotFoundAction(input: unknown) { await requireAdminSession(); const {id}=z.object({id:z.string().uuid()}).parse(input); await releasePass(id,"payment_not_found"); refresh(); return {ok:true} }
export async function setSongRoundStatusAction(input: unknown) { await requireAdminSession(); const d=z.object({id:z.string().uuid(),status:z.enum(ROUND_STATUSES)}).parse(input); await setRoundStatus(d.id,d.status); refresh(); return {ok:true} }
export async function createSongRoundAction(input: unknown) { await requireAdminSession(); const d=z.object({name:z.string().trim().min(1).max(120),capacity:z.number().int().min(1).max(1000)}).parse(input); await createRound(d.name,d.capacity); refresh(); return {ok:true} }
export async function markSongItemPlayedAction(input: unknown) { await requireAdminSession(); const {id}=z.object({id:z.string().uuid()}).parse(input); await markItemPlayed(id); refresh(); return {ok:true} }
export async function updateSongRoundCapacityAction(input: unknown) { await requireAdminSession(); const d=z.object({id:z.string().uuid(),capacity:z.number().int().min(1).max(1000)}).parse(input); if(!await updateRoundCapacity(d.id,d.capacity))throw new Error("La capacidad no puede ser menor que la ocupación"); refresh(); return {ok:true} }
export async function updateSongItemAction(input: unknown) { await requireAdminSession(); const d=z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(160),artist:z.string().trim().max(160)}).parse(input); if(!await updateSongItem(d.id,d.title,d.artist))throw new Error("La canción ya no puede editarse"); refresh(); return {ok:true} }
export async function archiveSongPassAction(input: unknown) { await requireAdminSession(); const {id}=z.object({id:z.string().uuid()}).parse(input); if(!await archivePass(id))throw new Error("El pase no puede archivarse todavía"); refresh(); return {ok:true} }
