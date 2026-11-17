import { getEvents } from "@/lib/data"
import { PosterStudio } from "@/components/admin/poster-studio"

export const dynamic = "force-dynamic"

export default async function CartelesPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  const events = await getEvents(false)
  const params = await searchParams
  const initialEvent = Number(params.evento)
  return <div className="space-y-6">
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-sky-300">IAM PROSOUND · DJ JOHNX</p>
      <h1 className="text-3xl font-black tracking-tight">Estudio de carteles</h1>
      <p className="mt-2 text-sm text-foreground/60">Crea imágenes profesionales para los eventos de John: tipografía editable, fotografía propia o fondos generados con IA.</p>
    </div>
    <PosterStudio events={events} initialEvent={Number.isSafeInteger(initialEvent) && initialEvent>0? initialEvent:undefined}/>
  </div>
}
