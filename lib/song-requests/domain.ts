import { createHash, randomBytes, randomInt } from "node:crypto"
import { z } from "zod"

export const createPassSchema = z.object({
  bizumName: z.string().trim().min(2, "Escribe el nombre que aparecerá en Bizum").max(100).transform(normalizeSpaces),
  whatsapp: z.string().trim().min(8).max(24).transform(normalizeWhatsapp),
  amount: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, "Usa un importe con máximo dos decimales").transform(amountToCents).pipe(z.number().int().min(100, "El importe mínimo es 1 €")),
  songCount: z.number().int().min(1).max(5),
  website: z.string().max(0).optional().default(""),
})
export const songItemsSchema = z.object({ items:z.array(z.object({ title:z.string().trim().min(1,"Escribe el título").max(160).transform(normalizeSpaces), artist:z.string().trim().max(160).transform(normalizeSpaces) })).min(1).max(5) })
export function normalizeSpaces(value:string){return value.trim().replace(/\s+/g," ")}
export function amountToCents(value:string){const normalized=value.replace(",",".");return Math.round(Number(normalized)*100)}
export function normalizeWhatsapp(value:string){const compact=value.replace(/[\s().-]/g,"");const normalized=compact.startsWith("00")?`+${compact.slice(2)}`:compact;if(!/^\+?[1-9]\d{7,14}$/.test(normalized))throw new Error("Número de WhatsApp no válido");return normalized.startsWith("+")?normalized:`+34${normalized}`}
export function createPrivateToken(){return randomBytes(32).toString("base64url")}
export function hashPrivateToken(token:string){return createHash("sha256").update(token).digest("hex")}
export function isValidPrivateToken(token:string){return /^[A-Za-z0-9_-]{43}$/.test(token)}
export function createPublicReference(){return `MC-${randomInt(1000,10000)}`}
export function buildWhatsappUrl(phone:string,message:string){return `https://wa.me/${normalizeWhatsapp(phone).slice(1)}?text=${encodeURIComponent(message)}`}
export function buildConfirmationMessage(input:{name:string;reference:string;songCount:number;privateUrl:string}){return `Hola, ${input.name} 🎶\n\nDJ John ha confirmado el pago de tu pase ${input.reference}.\n\nYa puedes elegir tus ${input.songCount} canciones aquí:\n${input.privateUrl}`}
export function escapeVCard(value:string){return value.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;")}
export function createVCard(name:string,phone:string){return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${escapeVCard(name)}\r\nTEL;TYPE=CELL:${escapeVCard(phone)}\r\nEND:VCARD\r\n`}
export function roundMessage(status:string){return status==="paused"?"Mi Canción está en pausa. Volvemos en unos minutos.":status==="full"?"La lista está completa por ahora.":status==="last_round"?"Última ronda de Mi Canción.":status==="closed"?"Mi Canción ha terminado por esta noche.":"Mi Canción está abierta."}
