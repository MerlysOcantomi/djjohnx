import {notFound} from "next/navigation"
import type {Metadata} from "next"
import {PassView} from "@/components/song-requests/pass-view"
import {getPassByToken} from "@/lib/song-requests/data"
import {getManualBizumConfig} from "@/lib/song-requests/config"
export const dynamic="force-dynamic"
export const metadata:Metadata={robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{token:string}>}){const{token}=await params;const pass=await getPassByToken(token);if(!pass)notFound();const config=getManualBizumConfig();return <PassView token={token} configAvailable={config.available} contactName={config.available?config.contactName:""} phone={config.available?config.phone:""} initial={{reference:pass.public_reference,bizumName:pass.bizum_name,amountCents:pass.amount_cents,songCount:pass.reserved_song_count,status:pass.status}}/>}
