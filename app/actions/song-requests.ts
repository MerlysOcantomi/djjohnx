"use server"
import {revalidatePath} from "next/cache"
import {z} from "zod"
import {requireAdminSession} from "@/lib/auth"
import {archivePass,confirmManualPayment,createRound,listPasses,markItemPlayed,releasePass,setRoundStatus,updateRoundCapacity,updateSongItem} from "@/lib/song-requests/data"
import {decryptToken} from "@/lib/song-requests/token"
import {buildConfirmationMessage,buildWhatsappUrl} from "@/lib/song-requests/domain"
import {sql} from "@/lib/db"
import {ROUND_STATUSES} from "@/lib/song-requests/types"
const refresh=()=>{revalidatePath('/admin/solicitudes');revalidatePath('/mi-cancion');revalidatePath('/mi-cancion/live')}
export async function confirmManualBizumAction(input:unknown){await requireAdminSession();const{id}=z.object({id:z.string().uuid()}).parse(input);const current=(await listPasses()).find(x=>x.id===id);if(!current||current.payment_mode!=="manual_bizum"||!['payment_reported','song_selection_open'].includes(current.status))throw new Error("El pago no está pendiente de confirmación manual");const pass=await confirmManualPayment(id,"admin");if(!pass)throw new Error("No se pudo confirmar");const tokenRows=await sql`SELECT private_token_encrypted FROM song_requests WHERE id=${id}` as {private_token_encrypted:string}[];const token=decryptToken(tokenRows[0].private_token_encrypted);const base=(process.env.NEXT_PUBLIC_APP_URL||'https://djjohnx.com').replace(/\/$/,'');const privateUrl=`${base}/mi-cancion/pase/${token}`;refresh();return{whatsappUrl:buildWhatsappUrl(pass.whatsapp_number,buildConfirmationMessage({name:pass.bizum_name,reference:pass.public_reference,songCount:pass.reserved_song_count,privateUrl}))}}
export async function markPaymentNotFoundAction(input:unknown){await requireAdminSession();const{id}=z.object({id:z.string().uuid()}).parse(input);await releasePass(id,'payment_not_found');refresh();return{ok:true}}
export async function setSongRoundStatusAction(input:unknown){await requireAdminSession();const d=z.object({id:z.string().uuid(),status:z.enum(ROUND_STATUSES)}).parse(input);await setRoundStatus(d.id,d.status);refresh();return{ok:true}}
export async function createSongRoundAction(input:unknown){await requireAdminSession();const d=z.object({name:z.string().trim().min(1).max(120),capacity:z.number().int().min(1).max(1000)}).parse(input);await createRound(d.name,d.capacity);refresh();return{ok:true}}
export async function markSongItemPlayedAction(input:unknown){await requireAdminSession();const{id}=z.object({id:z.string().uuid()}).parse(input);await markItemPlayed(id);refresh();return{ok:true}}

export async function updateSongRoundCapacityAction(input:unknown){await requireAdminSession();const d=z.object({id:z.string().uuid(),capacity:z.number().int().min(1).max(1000)}).parse(input);if(!await updateRoundCapacity(d.id,d.capacity))throw new Error("La capacidad no puede ser menor que la ocupación");refresh();return{ok:true}}
export async function updateSongItemAction(input:unknown){await requireAdminSession();const d=z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(160),artist:z.string().trim().max(160)}).parse(input);if(!await updateSongItem(d.id,d.title,d.artist))throw new Error("La canción ya no puede editarse");refresh();return{ok:true}}
export async function archiveSongPassAction(input:unknown){await requireAdminSession();const{id}=z.object({id:z.string().uuid()}).parse(input);if(!await archivePass(id))throw new Error("El pase no puede archivarse todavía");refresh();return{ok:true}}
