"use client"

import Image from "next/image"
import { MapPin, Clock, Music, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const musicStyles = [
  "Salsa",
  "Bachata",
  "Merengue",
  "Cubano",
  "Reggaeton",
  "Latin House",
]

export function DCubaSection() {
  return (
    <section id="dcuba" className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url('/placeholder.svg?height=800&width=1920')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background" />
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div className="flex flex-col justify-center">
            {/* Badge */}
            <Badge
              variant="outline"
              className="mb-6 w-fit border-accent/50 bg-accent/10 px-4 py-2 text-accent"
            >
              <Star className="mr-2 h-4 w-4" fill="currentColor" />
              RESIDENCIA OFICIAL
            </Badge>

            {/* Title */}
            <h2 className="mb-6 text-4xl font-black uppercase tracking-tight md:text-5xl lg:text-6xl">
              <span className="text-gradient-gold">D&apos;CUBA BAR</span>
            </h2>
            <p className="mb-2 text-xl font-semibold text-secondary">
              ALICANTE
            </p>

            {/* Description */}
            <p className="mb-8 leading-relaxed text-foreground/70">
              D&apos;Cuba Bar es el corazón de la música latina en Alicante. Como DJ 
              residente, cada fin de semana transformo el local en un pedacito de 
              La Habana, con los mejores ritmos de salsa, bachata, merengue y 
              reggaeton. Una experiencia cubana auténtica en el Mediterráneo.
            </p>

            {/* Music Styles */}
            <div className="mb-8 flex flex-wrap gap-2">
              {musicStyles.map((style) => (
                <span
                  key={style}
                  className="rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-medium text-secondary"
                >
                  {style}
                </span>
              ))}
            </div>

            {/* Info */}
            <div className="mb-8 space-y-3 text-foreground/80">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Calle Example 123, Alicante, España</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span>Viernes y Sábados: 23:00 - 05:00</span>
              </div>
              <div className="flex items-center gap-3">
                <Music className="h-5 w-5 text-primary" />
                <span>DJ JOHNX en cabina cada fin de semana</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="w-fit bg-accent px-8 font-bold uppercase tracking-wide text-accent-foreground transition-all hover:bg-accent/90 hover:scale-105 glow-spotify"
            >
              Visitar D&apos;Cuba
            </Button>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image
                src="/placeholder.svg?height=800&width=640"
                alt="D'Cuba Bar Alicante"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              
              {/* Overlay Info */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="glass rounded-xl p-4">
                  <p className="text-lg font-bold text-foreground">
                    &quot;El mejor ambiente latino de Alicante&quot;
                  </p>
                  <p className="mt-1 text-sm text-foreground/60">
                    - Experiencia cubana auténtica
                  </p>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -left-4 -top-4 -z-10 h-full w-full rounded-2xl border-2 border-accent/30" />
            <div className="absolute -right-8 top-1/4 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
