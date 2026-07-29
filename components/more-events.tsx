import Image from "next/image"
import { CalendarDays, MapPin, Ticket } from "lucide-react"
import { formatDateEs } from "@/lib/format"

export type PublicEvent = {
  id: number
  title: string
  date: string | null
  time: string | null
  venue: string | null
  city: string | null
  image: string | null
  ticketsLink: string | null
}

/**
 * Resto de eventos publicados, ademas del destacado. No se renderiza nada si
 * solo hay un evento, de modo que la portada original no cambia.
 */
export function MoreEvents({ data }: { data?: PublicEvent[] }) {
  if (!data || data.length === 0) return null

  return (
    <div className="relative mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <h3 className="mb-6 text-center text-sm font-medium uppercase tracking-[0.3em] text-foreground/50">
        Más fechas
      </h3>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((e) => (
          <li key={e.id} className="glass-card overflow-hidden rounded-xl transition-all hover:glow-gold">
            <div className="flex gap-4 p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted/30">
                {e.image ? (
                  <Image src={e.image} alt={e.title} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <CalendarDays className="h-6 w-6 text-primary/30" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold uppercase tracking-wide text-foreground">{e.title}</p>

                {(e.date || e.time) && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/60">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">
                      {formatDateEs(e.date)}
                      {e.date && e.time ? " · " : ""}
                      {e.time}
                    </span>
                  </p>
                )}

                {(e.venue || e.city) && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground/60">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary" />
                    <span className="truncate">{[e.venue, e.city].filter(Boolean).join(", ")}</span>
                  </p>
                )}

                {e.ticketsLink && (
                  <a
                    href={e.ticketsLink}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    Entradas
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
