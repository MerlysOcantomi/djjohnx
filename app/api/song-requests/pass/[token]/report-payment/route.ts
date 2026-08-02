import {NextResponse} from "next/server"
import {reportManualPayment} from "@/lib/song-requests/data"
export async function POST(_:Request,{params}:{params:Promise<{token:string}>}){const{token}=await params;const pass=await reportManualPayment(token);return pass?NextResponse.json({status:pass.status},{headers:{"cache-control":"private, no-store"}}):NextResponse.json({error:"No se pudo reservar el espacio."},{status:409})}
