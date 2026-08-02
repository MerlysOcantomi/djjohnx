import {NextResponse} from "next/server"
import {getManualBizumConfig} from "@/lib/song-requests/config"
import {createVCard} from "@/lib/song-requests/domain"
export async function GET(){const c=getManualBizumConfig();if(!c.available)return NextResponse.json({error:"Contacto no disponible"},{status:503});return new NextResponse(createVCard(c.contactName,c.phone),{headers:{"content-type":"text/vcard; charset=utf-8","content-disposition":"attachment; filename=DJ-John-Bizum.vcf","cache-control":"no-store"}})}
