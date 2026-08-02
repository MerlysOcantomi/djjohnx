import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { activeRequestCount, createSongRequest, getSongRequestSettings, setCheckout } from "@/lib/song-requests/data"
import { songRequestSchema } from "@/lib/song-requests/domain"
import { getPaymentProvider } from "@/lib/song-requests/payment"
import { checkSongRequestRateLimit } from "@/lib/song-requests/rate-limit"
export async function POST(request:NextRequest){
  try{
    const ip=request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown"
    if(!checkSongRequestRateLimit(ip)) return NextResponse.json({error:"Demasiados intentos. Espera un minuto."},{status:429})
    const input=songRequestSchema.parse(await request.json()); const settings=await getSongRequestSettings()
    if(settings.serviceStatus!=="open") return NextResponse.json({error:settings.serviceStatus==="paused"?"Las solicitudes están pausadas durante unos minutos.":"Las solicitudes están cerradas."},{status:409})
    if(settings.activeRequestLimit && await activeRequestCount(settings.eventId)>=settings.activeRequestLimit) return NextResponse.json({error:"La lista está temporalmente completa."},{status:409})
    const songRequest=await createSongRequest(input,settings)
    if(songRequest.payment_status==="not_required") return NextResponse.json({requestId:songRequest.id,checkoutUrl:`/mi-cancion/gracias?id=${songRequest.id}`})
    if(songRequest.checkout_session_id) return NextResponse.json({requestId:songRequest.id,checkoutUrl:`/mi-cancion/gracias?id=${songRequest.id}`})
    const provider=getPaymentProvider(); const returnUrl=`${process.env.NEXT_PUBLIC_APP_URL||request.nextUrl.origin}/mi-cancion/gracias?id=${songRequest.id}`
    const checkout=await provider.createCheckout({requestId:songRequest.id,reference:songRequest.payment_reference,amountCents:songRequest.amount_cents,currency:songRequest.currency,returnUrl})
    await setCheckout(songRequest.id,checkout.sessionId); return NextResponse.json({requestId:songRequest.id,checkoutUrl:checkout.checkoutUrl})
  }catch(error){ if(error instanceof ZodError)return NextResponse.json({error:error.issues[0]?.message||"Revisa los datos"},{status:400}); console.error("[song-requests] create failed"); return NextResponse.json({error:"No se pudo preparar la petición. Inténtalo de nuevo."},{status:500}) }
}
