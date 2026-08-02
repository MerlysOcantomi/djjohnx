import { NextRequest,NextResponse } from "next/server"
import { getSongRequest } from "@/lib/song-requests/data"
import { publicPaymentState } from "@/lib/song-requests/domain"
export async function GET(request:NextRequest){const id=request.nextUrl.searchParams.get("id");if(!id)return NextResponse.json({error:"Falta la petición"},{status:400});try{const item=await getSongRequest(id);if(!item)return NextResponse.json({error:"Petición no encontrada"},{status:404});return NextResponse.json({state:publicPaymentState(item.payment_status)})}catch{return NextResponse.json({error:"No se pudo consultar"},{status:500})}}
