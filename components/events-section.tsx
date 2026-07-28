"use client"

import Image from "next/image"
import { Calendar, Clock, MapPin, Music } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EventsData {
  title?: string
  eventName?: string
  image?: string
  venue?: string
  location?: string
  schedule?: string
  session?: string
}

export function EventsSection({ data }: { data?: EventsData }) {
  const image = data?.image || "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JOHN%20NEON-Y89f6oQAVVw7y47AVRkH8pLFPQ9Z1q.png"
  const eventName = data?.eventName || "BABYLON 2.0"
  const venue = data?.venue || "Babylon 2.0"
  const location = data?.location || "San Pedro del Pinatar, Murcia"
  const schedule = data?.schedule || "Todos los Jueves"
  const session = data?.session || "REPARTO CUBANO"
  return (
    <section id="eventos" className="relative py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.3em] text-primary">
            No te los pierdas
          </span>
          <h2 className="text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">PROXIMOS EVENTOS</span>
          </h2>
        </div>

        {/* Featured Event Card */}
        <div className="group glass-card overflow-hidden rounded-2xl transition-all duration-300 hover:glow-gold">
          <div className="grid md:grid-cols-2">
            {/* Event Image */}
            <div className="relative aspect-[3/4] overflow-hidden md:aspect-auto md:min-h-[500px]">
              <Image
                src={image}
                alt={`DJ JOHNX en ${venue}`}
                fill
                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-background/80" />

              {/* Badge */}
              <Badge className="absolute left-4 top-4 bg-primary text-primary-foreground text-sm px-3 py-1">
                PROXIMO EVENTO
              </Badge>
            </div>

            {/* Event Info */}
            <div className="flex flex-col justify-center p-8 md:p-12">
              <div className="mb-6">
                <h3 className="mb-2 text-3xl font-black uppercase tracking-wide text-foreground md:text-4xl lg:text-5xl">
                  BABYLON <span className="text-gradient-gold">2.0</span>
                </h3>
                <p className="text-lg text-foreground/60 font-medium">
                  La noche mas caliente de la costa
                </p>
              </div>

              <div className="mb-8 space-y-4 text-foreground/70">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="block text-sm text-foreground/50">Lugar</span>
                    <span className="text-base font-semibold text-foreground">{venue}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                    <Calendar className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <span className="block text-sm text-foreground/50">Ubicacion</span>
                    <span className="text-base font-semibold text-foreground">{location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <span className="block text-sm text-foreground/50">Cuando</span>
                    <span className="text-base font-semibold text-foreground">{schedule}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="block text-sm text-foreground/50">Sesion</span>
                    <span className="text-base font-semibold text-gradient-gold">{session}</span>
                  </div>
                </div>
              </div>

              {/* Decorative line */}
              <div className="h-px w-full bg-gradient-to-r from-primary/50 via-secondary/50 to-transparent" />

              <p className="mt-6 text-sm text-foreground/40 uppercase tracking-widest">
                {schedule} - {session} en {venue}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
