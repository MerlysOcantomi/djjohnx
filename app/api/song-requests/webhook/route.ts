import { NextRequest,NextResponse } from "next/server"
import { applyPaymentEvent } from "@/lib/song-requests/data"
import { getPaymentProvider } from "@/lib/song-requests/payment"
export async function POST(request:NextRequest){const raw=await request.text();try{const provider=getPaymentProvider();const event=provider.verifyWebhook(raw,request.headers.get("x-payment-signature")||"");const result=await applyPaymentEvent(provider.name,event);return NextResponse.json({received:true,duplicate:result.duplicate})}catch(error){const invalid=error instanceof Error&&error.message.includes("SIGNATURE");return NextResponse.json({error:invalid?"Firma inválida":"Evento rechazado"},{status:invalid?401:400})}}
