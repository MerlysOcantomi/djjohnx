import { getEvents } from "@/lib/data"
import { EventsManager } from "@/components/admin/events-manager"

export const dynamic = "force-dynamic"

export default async function EventosPage() {
  const events = await getEvents(false)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
        <p className="text-sm text-muted-foreground">Gestiona tus proximos eventos y actuaciones.</p>
      </div>
      <EventsManager initialEvents={events} />
    </div>
  )
}
