import {NextResponse} from "next/server"
import {getPublicRound} from "@/lib/song-requests/data"
export async function GET(){return NextResponse.json(await getPublicRound(),{headers:{"cache-control":"no-store"}})}
