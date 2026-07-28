"use client"

import { Button } from "@/components/ui/button"
import { Play, MessageCircle } from "lucide-react"
import { FloatingNotes } from "@/components/floating-notes"

type HeroData = {
  backgroundImage?: string
  backgroundPosition?: string
  title?: string
  subtitle?: string
  description?: string
  visible?: boolean
}

export function Hero({ data }: { data?: HeroData }) {
  const bg = data?.backgroundImage || 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/facebook_1778951869128_7461464940495022770-zB1r4yIazjXJjULMBGCScAy2LPyCbt.jpg'
  const pos = data?.backgroundPosition || 'center 55%'
  const title = data?.title || 'DJ JOHNX'
  const subtitle = data?.subtitle || 'FUSION LATINA'
  const description = data?.description || 'Latin House, Afrobeats, Reggaeton, Salsa y la mejor musica cubana. Mas de 10 anos creando experiencias musicales inolvidables.'

  return (
    <section
      id="inicio"
      className="relative flex min-h-[120vh] items-center justify-center overflow-hidden"
    >
      {/* Background Image - Full Screen */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${bg}')`,
          backgroundPosition: pos,
        }}
      />
      
      {/* Light gradient overlay - only at bottom for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background via-background/80 to-transparent" />
      
      {/* Floating Musical Notes */}
      <FloatingNotes />

      {/* Content - Positioned at bottom */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pt-32 pb-24 text-center mt-auto">

        {/* Main Title */}
        <h1 className="mb-4 text-6xl font-black uppercase tracking-tight sm:text-7xl md:text-8xl lg:text-9xl drop-shadow-2xl">
          <span className="text-gradient-gold">{title}</span>
        </h1>

        {/* Subtitle */}
        <p className="mb-6 text-2xl font-bold uppercase tracking-[0.2em] text-secondary sm:text-3xl md:text-4xl drop-shadow-lg">
          {subtitle}
        </p>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-white/90 drop-shadow-md md:text-lg">
          {description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="group bg-primary px-8 py-6 text-lg font-bold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 glow-gold"
            asChild
          >
            <a href="#eventos">
              <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              Ver Eventos
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/50 bg-white/10 backdrop-blur-sm px-8 py-6 text-lg font-bold uppercase tracking-wide text-white transition-all hover:bg-white/20 hover:scale-105"
            asChild
          >
            <a href="#contacto">
              <MessageCircle className="mr-2 h-5 w-5" />
              Contactar
            </a>
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-white/70">Scroll</span>
          <div className="h-8 w-5 rounded-full border-2 border-white/50 p-1">
            <div className="h-2 w-1.5 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}
