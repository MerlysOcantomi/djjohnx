import type {Metadata} from "next"
import {EnergyBar} from "@/components/song-requests/energy-bar"
import {getPublicRound} from "@/lib/song-requests/data"
export const dynamic="force-dynamic"
export const metadata:Metadata={title:"Mi Canción en directo",robots:{index:false,follow:false}}
export default async function Page(){const round=await getPublicRound();const base=(process.env.NEXT_PUBLIC_APP_URL||"https://djjohnx.com").replace(/\/$/,"");const url=`${base}/mi-cancion`;const qr=`https://quickchart.io/qr?size=700&margin=2&format=svg&text=${encodeURIComponent(url)}`;return <main className="grid min-h-screen place-items-center bg-[#08080b] p-8 text-white"><section className="print-poster w-full max-w-4xl text-center"><p className="text-3xl font-black tracking-[.3em] text-primary">DJ JOHNX</p><h1 className="my-5 text-7xl font-black">Mi Canción</h1><div className="mx-auto max-w-2xl"><EnergyBar initial={round} live/></div><img src={qr} alt="QR para abrir Mi Canción" width="420" height="420" className="mx-auto mt-8 rounded-3xl bg-white p-5"/><p className="mt-4 text-2xl">Escanea · activa tu pase · elige tus canciones</p></section></main>}
