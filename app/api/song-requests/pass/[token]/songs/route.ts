import {NextResponse} from "next/server"
import {ZodError} from "zod"
import {songItemsSchema} from "@/lib/song-requests/domain"
import {submitSongs} from "@/lib/song-requests/data"
export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){try{const{token}=await params;const{items}=songItemsSchema.parse(await request.json());await submitSongs(token,items);return NextResponse.json({ok:true},{headers:{"cache-control":"private, no-store"}})}catch(e){return NextResponse.json({error:e instanceof ZodError?e.issues[0]?.message:"No se pudieron guardar las canciones."},{status:409})}}
