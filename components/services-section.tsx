import Image from "next/image"
import { Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatEurFromMinor } from "@/lib/format"

export type PublicService = {
  id: number
  title: string
  description: string | null
  image: string | null
  priceMinor: number | null
  priceNote: string | null
  buttonText: string | null
  buttonLink: string | null
}

/**
 * Servicios publicados. La seccion no se renderiza si no hay ninguno, asi que
 * la portada mantiene su aspecto original mientras no se publique un servicio.
 */
export function ServicesSection({ data }: { data?: PublicService[] }) {
  if (!data || data.length === 0) return null

  return (
    <section id="servicios" className="relative py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute left-0 top-1/4 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block text-sm font-medium uppercase tracking-[0.3em] text-primary">
            Lo que ofrezco
          </span>
          <h2 className="text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">SERVICIOS</span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <article
              key={s.id}
              className="group glass-card flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:glow-gold"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
                {s.image ? (
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Music className="h-10 w-10 text-primary/30" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="mb-2 text-xl font-bold uppercase tracking-wide text-foreground">{s.title}</h3>

                {s.description && (
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-foreground/70">{s.description}</p>
                )}

                {(s.priceMinor !== null || s.priceNote) && (
                  <p className="mb-4 text-lg font-black text-gradient-gold">
                    {s.priceMinor !== null ? formatEurFromMinor(s.priceMinor) : ""}
                    {s.priceNote && (
                      <span className="ml-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                        {s.priceNote}
                      </span>
                    )}
                  </p>
                )}

                {s.buttonText && s.buttonLink && (
                  <Button asChild variant="secondary" className="mt-auto w-full">
                    <a href={s.buttonLink}>{s.buttonText}</a>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
