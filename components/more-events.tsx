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
 * Resto de eventos publicados, ademas del destacado. Se muestran como
 * tarjetas grandes para que las siguientes fechas mantengan el protagonismo
 * visual de la seccion principal de eventos.
 */
export function MoreEvents({ data }: { data?: PublicEvent[] }) {
  if (!data || data.length === 0) return null

  return (
    <div className="relative mx-auto -mt-8 mb-24 max-w-7xl px-4 sm:px-6 md:mb-32 lg:px-8">
      <div className="mb-8 text-center md:mb-10">
        <span className="text-sm font-medium uppercase tracking-[0.3em] text-primary">
          Más fechas
        </span>
      </div>

      <ul className="grid gap-8 lg:grid-cols-2">
        {data.map((e) => (
          <li
            key={e.id}
            className="group glass-card overflow-hidden rounded-2xl transition-all duration-300 hover:glow-gold"
          >
            <div className="relative aspect-[4/3] min-h-[300px] overflow-hidden bg-muted/30 sm:min-h-[360px]">
              {e.image ? (
                <Image
                  src={e.image}
                  alt={e.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <CalendarDays className="h-16 w-16 text-primary/30" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
              <div className="absolute left-5 top-5 rounded-full border border-primary/30 bg-background/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary backdrop-blur-md">
                Próxima fecha
              </div>
            </div>

            <div className="p-6 md:p-8">
              <h3 className="text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl">
                {e.title}
              </h3>

              <div className="mt-6 space-y-4">
                {(e.date || e.time) && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-foreground/45">Cuándo</span>
                      <span className="text-base font-semibold text-foreground">
                        {formatDateEs(e.date)}
                        {e.date && e.time ? " · " : ""}
                        {e.time}
                      </span>
                    </div>
                  </div>
                )}

                {(e.venue || e.city) && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                      <MapPin className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-foreground/45">Lugar</span>
                      <span className="text-base font-semibold text-foreground">
                        {[e.venue, e.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {e.ticketsLink && (
                <a
                  href={e.ticketsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-all hover:scale-[1.02] hover:bg-primary/90"
                >
                  <Ticket className="h-4 w-4" />
                  Entradas
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
